import { Effect, Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { ProfileIdSchema } from '@omoikane/domain/profile';
import { currentProfileRow, makeProfileQueryClientStub } from '../testing';
import { findCurrentProfile } from './find-current-profile';

const profileId = Schema.decodeUnknownSync(ProfileIdSchema)(
  '00000000-0000-4000-8000-000000000001'
);

describe('findCurrentProfile', () => {
  it('queries one current profile by stable identity', async () => {
    const stub = makeProfileQueryClientStub({
      data: currentProfileRow,
      error: null,
    });

    const result = await Effect.runPromise(
      findCurrentProfile(stub.client, profileId)
    );

    expect(result?.displayName).toBe('Workspace Owner');
    expect(stub.from).toHaveBeenCalledExactlyOnceWith('current_profiles');
    expect(stub.select).toHaveBeenCalledExactlyOnceWith(
      'user_id, username, display_name, avatar_url, status'
    );
    expect(stub.eq).toHaveBeenCalledExactlyOnceWith('user_id', profileId);
    expect(stub.maybeSingle).toHaveBeenCalledOnce();
  });

  it('preserves absence as null', async () => {
    const stub = makeProfileQueryClientStub({
      data: null,
      error: null,
    });

    const result = await Effect.runPromise(
      findCurrentProfile(stub.client, profileId)
    );

    expect(result).toBeNull();
  });

  it('translates PostgREST failures', async () => {
    const stub = makeProfileQueryClientStub({
      data: null,
      error: {
        code: '08006',
        message: 'Connection unavailable',
      },
    });

    const result = await Effect.runPromise(
      findCurrentProfile(stub.client, profileId).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('ProfileRepositoryUnavailableError');
    }
  });
});
