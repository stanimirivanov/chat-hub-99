import { Effect, Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { ProfileIdSchema } from '@chat-hub/domain/profile';
import { currentProfileRow, makeProfileListClientStub } from '../testing';
import { listCurrentProfiles } from './list-current-profiles';

const profileId = Schema.decodeUnknownSync(ProfileIdSchema)(
  '00000000-0000-4000-8000-000000000001'
);

describe('listCurrentProfiles', () => {
  it('queries current profiles once for the requested identities', async () => {
    const stub = makeProfileListClientStub({
      data: [currentProfileRow],
      error: null,
    });

    const result = await Effect.runPromise(
      listCurrentProfiles(stub.client, [profileId])
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.displayName).toBe('Workspace Owner');
    expect(stub.from).toHaveBeenCalledExactlyOnceWith('current_profiles');
    expect(stub.select).toHaveBeenCalledExactlyOnceWith(
      'user_id, username, display_name, avatar_url, status'
    );
    expect(stub.inFilter).toHaveBeenCalledExactlyOnceWith('user_id', [
      profileId,
    ]);
  });

  it('does not query Supabase for an empty identity collection', async () => {
    const stub = makeProfileListClientStub({
      data: [currentProfileRow],
      error: null,
    });

    const result = await Effect.runPromise(
      listCurrentProfiles(stub.client, [])
    );

    expect(result).toEqual([]);
    expect(stub.from).not.toHaveBeenCalled();
  });

  it('translates PostgREST failures', async () => {
    const stub = makeProfileListClientStub({
      data: null,
      error: {
        code: '08006',
        message: 'Connection unavailable',
      },
    });

    const result = await Effect.runPromise(
      listCurrentProfiles(stub.client, [profileId]).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('ProfileRepositoryUnavailableError');
    }
  });

  it('rejects malformed rows returned by the profile view', async () => {
    const stub = makeProfileListClientStub({
      data: [
        {
          ...currentProfileRow,
          display_name: null,
        },
      ],
      error: null,
    });

    const result = await Effect.runPromise(
      listCurrentProfiles(stub.client, [profileId]).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidProfileDataError');
    }
  });
});
