import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  currentProfileRow,
  makeProfileUsernameQueryClientStub,
} from '../testing';
import { findActiveProfileByUsername } from './find-active-profile-by-username';

describe('findActiveProfileByUsername', () => {
  it('finds and validates one active profile by exact username', async () => {
    const stub = makeProfileUsernameQueryClientStub({
      data: currentProfileRow,
      error: null,
    });

    const result = await Effect.runPromise(
      findActiveProfileByUsername(stub.client, 'owner')
    );

    expect(stub.from).toHaveBeenCalledExactlyOnceWith('current_profiles');
    expect(stub.ilike).toHaveBeenCalledExactlyOnceWith('username', 'owner');
    expect(stub.eq).toHaveBeenCalledExactlyOnceWith('status', 'active');
    expect(result).toEqual({
      id: currentProfileRow.user_id,
      username: 'owner',
      displayName: 'Workspace Owner',
      avatarUrl: null,
      status: 'active',
    });
  });

  it('escapes ILIKE wildcard characters to preserve exact matching', async () => {
    const stub = makeProfileUsernameQueryClientStub({
      data: null,
      error: null,
    });

    await Effect.runPromise(
      findActiveProfileByUsername(stub.client, 'owner_%\\team')
    );

    expect(stub.ilike).toHaveBeenCalledExactlyOnceWith(
      'username',
      'owner\\_\\%\\\\team'
    );
  });

  it('preserves explicit absence', async () => {
    const stub = makeProfileUsernameQueryClientStub({
      data: null,
      error: null,
    });

    await expect(
      Effect.runPromise(findActiveProfileByUsername(stub.client, 'missing'))
    ).resolves.toBeNull();
  });

  it('translates provider failures', async () => {
    const stub = makeProfileUsernameQueryClientStub({
      data: null,
      error: { code: '08006', message: 'Connection unavailable' },
    });

    const result = await Effect.runPromise(
      findActiveProfileByUsername(stub.client, 'owner').pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('ProfileRepositoryUnavailableError');
    }
  });

  it('rejects an inactive row returned outside the query contract', async () => {
    const stub = makeProfileUsernameQueryClientStub({
      data: { ...currentProfileRow, status: 'deactivated' },
      error: null,
    });

    const result = await Effect.runPromise(
      findActiveProfileByUsername(stub.client, 'owner').pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidProfileDataError');
    }
  });
});
