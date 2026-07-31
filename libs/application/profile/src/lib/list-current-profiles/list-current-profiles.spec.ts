import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import { ProfileRepositoryUnavailableError } from '../repository';
import {
  makeListCurrentProfilesRepository,
  profile,
  profileId,
} from '../testing';
import { listCurrentProfiles } from './list-current-profiles';

describe('listCurrentProfiles', () => {
  it('deduplicates validated identities before loading visible profiles', async () => {
    const { listCurrentByIds, repositoryLayer } =
      makeListCurrentProfilesRepository(() => Effect.succeed([profile]));

    const result = await Effect.runPromise(
      listCurrentProfiles({
        profileIds: [profileId, profileId],
      }).pipe(Effect.provide(repositoryLayer))
    );

    expect(result).toEqual([profile]);
    expect(listCurrentByIds).toHaveBeenCalledExactlyOnceWith([profileId]);
  });

  it('returns an empty collection without repository access', async () => {
    const { listCurrentByIds, repositoryLayer } =
      makeListCurrentProfilesRepository(() => Effect.succeed([profile]));

    const result = await Effect.runPromise(
      listCurrentProfiles({ profileIds: [] }).pipe(
        Effect.provide(repositoryLayer)
      )
    );

    expect(result).toEqual([]);
    expect(listCurrentByIds).not.toHaveBeenCalled();
  });

  it.each([
    ['null input', null],
    ['undefined input', undefined],
    ['missing identity list', {}],
    ['null identity list', { profileIds: null }],
    ['non-array identity list', { profileIds: profileId }],
    ['invalid identity', { profileIds: [''] }],
  ])('rejects %s before repository access', async (_label, input) => {
    const { listCurrentByIds, repositoryLayer } =
      makeListCurrentProfilesRepository(() => Effect.succeed([profile]));

    const result = await Effect.runPromise(
      listCurrentProfiles(input).pipe(
        Effect.provide(repositoryLayer),
        Effect.either
      )
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidCurrentProfilesInputError');
    }
    expect(listCurrentByIds).not.toHaveBeenCalled();
  });

  it('preserves repository failures', async () => {
    const repositoryError = new ProfileRepositoryUnavailableError({
      cause: new Error('Provider unavailable'),
    });
    const { repositoryLayer } = makeListCurrentProfilesRepository(() =>
      Effect.fail(repositoryError)
    );

    const result = await Effect.runPromise(
      listCurrentProfiles({ profileIds: [profileId] }).pipe(
        Effect.provide(repositoryLayer),
        Effect.either
      )
    );

    expect(result).toEqual(Either.left(repositoryError));
  });
});
