import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import type { UpdateCurrentProfileCommand } from '@chat-hub/application/profile';
import { makeProfileCommandClientStub, updatedProfileRow } from '../testing';
import { updateCurrentProfile } from './update-current-profile';

const command: UpdateCurrentProfileCommand = {
  displayName: 'Updated Owner',
  username: 'updated-owner',
  avatarUrl: null,
};

describe('updateCurrentProfile', () => {
  it('executes the RPC and returns its validated profile projection', async () => {
    const stub = makeProfileCommandClientStub({
      data: updatedProfileRow,
      error: null,
    });

    const result = await Effect.runPromise(
      updateCurrentProfile(stub.client, command)
    );

    expect(stub.rpc).toHaveBeenCalledExactlyOnceWith('update_my_profile', {
      p_display_name: 'Updated Owner',
      p_username: 'updated-owner',
    });
    expect(result).toEqual({
      id: updatedProfileRow.user_id,
      username: 'updated-owner',
      displayName: 'Updated Owner',
      avatarUrl: null,
      status: 'active',
    });
  });

  it('maps the username uniqueness constraint to a typed conflict', async () => {
    const stub = makeProfileCommandClientStub({
      data: null,
      error: {
        code: '23505',
        message:
          'duplicate key value violates unique constraint "profile_heads_current_username_unique"',
      },
    });

    const result = await Effect.runPromise(
      updateCurrentProfile(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'ProfileUsernameUnavailableError',
        username: 'updated-owner',
      });
    }
  });

  it('does not misclassify unrelated uniqueness failures', async () => {
    const stub = makeProfileCommandClientStub({
      data: null,
      error: {
        code: '23505',
        message:
          'duplicate key value violates unique constraint "profile_versions_user_version_unique"',
      },
    });

    const result = await Effect.runPromise(
      updateCurrentProfile(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('ProfileRepositoryUnavailableError');
    }
  });

  it('rejects a missing RPC result at the infrastructure boundary', async () => {
    const stub = makeProfileCommandClientStub({
      data: null,
      error: null,
    });

    const result = await Effect.runPromise(
      updateCurrentProfile(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidProfileDataError');
    }
  });
});
