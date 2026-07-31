import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import { ProfileUsernameUnavailableError } from '../repository';
import { makeUpdateCurrentProfileRepository, profile } from '../testing';
import { updateCurrentProfile } from './update-current-profile';

describe('updateCurrentProfile', () => {
  it('normalizes editable fields before repository access', async () => {
    const { repositoryLayer, updateCurrent } =
      makeUpdateCurrentProfileRepository(() => Effect.succeed(profile));

    const result = await Effect.runPromise(
      updateCurrentProfile({
        displayName: '  Workspace Owner  ',
        username: '  owner  ',
        avatarUrl: '   ',
      }).pipe(Effect.provide(repositoryLayer))
    );

    expect(result).toBe(profile);
    expect(updateCurrent).toHaveBeenCalledExactlyOnceWith({
      displayName: 'Workspace Owner',
      username: 'owner',
      avatarUrl: null,
    });
  });

  it.each([
    ['missing optional values', {}, null, null],
    ['null optional values', { username: null, avatarUrl: null }, null, null],
  ])(
    'normalizes %s to absence',
    async (_label, optionalInput, username, avatarUrl) => {
      const { repositoryLayer, updateCurrent } =
        makeUpdateCurrentProfileRepository(() => Effect.succeed(profile));

      await Effect.runPromise(
        updateCurrentProfile({
          displayName: 'Workspace Owner',
          ...optionalInput,
        }).pipe(Effect.provide(repositoryLayer))
      );

      expect(updateCurrent).toHaveBeenCalledExactlyOnceWith({
        displayName: 'Workspace Owner',
        username,
        avatarUrl,
      });
    }
  );

  it.each([
    ['null input', null, 'displayName'],
    ['undefined input', undefined, 'displayName'],
    ['missing display name', {}, 'displayName'],
    ['null display name', { displayName: null }, 'displayName'],
    ['blank display name', { displayName: '   ' }, 'displayName'],
    ['non-string username', { displayName: 'Owner', username: 42 }, 'username'],
    [
      'non-string avatar value',
      { displayName: 'Owner', avatarUrl: false },
      'avatarUrl',
    ],
  ])('rejects %s before repository access', async (_label, input, field) => {
    const { repositoryLayer, updateCurrent } =
      makeUpdateCurrentProfileRepository(() => Effect.succeed(profile));

    const result = await Effect.runPromise(
      updateCurrentProfile(input).pipe(
        Effect.provide(repositoryLayer),
        Effect.either
      )
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'InvalidProfileUpdateInputError',
        field,
      });
    }
    expect(updateCurrent).not.toHaveBeenCalled();
  });

  it('preserves a username conflict as a typed failure', async () => {
    const failure = new ProfileUsernameUnavailableError({
      username: 'owner',
    });
    const { repositoryLayer } = makeUpdateCurrentProfileRepository(() =>
      Effect.fail(failure)
    );

    const result = await Effect.runPromise(
      updateCurrentProfile({
        displayName: 'Workspace Owner',
        username: 'owner',
      }).pipe(Effect.provide(repositoryLayer), Effect.either)
    );

    expect(result).toEqual(Either.left(failure));
  });
});
