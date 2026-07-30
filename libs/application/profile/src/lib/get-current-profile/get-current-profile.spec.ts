import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  makeFindCurrentProfileRepository,
  profile,
  profileId,
} from '../testing';
import { getCurrentProfile } from './get-current-profile';

describe('getCurrentProfile', () => {
  it('loads the validated profile identity', async () => {
    const { findCurrentById, repositoryLayer } =
      makeFindCurrentProfileRepository(() => Effect.succeed(profile));

    const result = await Effect.runPromise(
      getCurrentProfile({ userId: profileId }).pipe(
        Effect.provide(repositoryLayer)
      )
    );

    expect(result).toBe(profile);
    expect(findCurrentById).toHaveBeenCalledExactlyOnceWith(profileId);
  });

  it.each([
    ['null input', null],
    ['undefined input', undefined],
    ['missing user identity', {}],
    ['null user identity', { userId: null }],
    ['empty user identity', { userId: '' }],
  ])('rejects %s before repository access', async (_label, input) => {
    const { findCurrentById, repositoryLayer } =
      makeFindCurrentProfileRepository(() => Effect.succeed(profile));

    const result = await Effect.runPromise(
      getCurrentProfile(input).pipe(
        Effect.provide(repositoryLayer),
        Effect.either
      )
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidCurrentProfileInputError');
    }
    expect(findCurrentById).not.toHaveBeenCalled();
  });

  it('fails when no visible current projection exists', async () => {
    const { repositoryLayer } = makeFindCurrentProfileRepository(() =>
      Effect.succeed(null)
    );

    const result = await Effect.runPromise(
      getCurrentProfile({ userId: profileId }).pipe(
        Effect.provide(repositoryLayer),
        Effect.either
      )
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'CurrentProfileNotFoundError',
        profileId,
      });
    }
  });
});
