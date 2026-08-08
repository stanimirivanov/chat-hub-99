import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import { WorkspaceSlugUnavailableError } from '../repository';
import { makeCreateWorkspaceRepository, workspace } from '../testing';
import { createWorkspace } from './create-workspace';

describe('createWorkspace', () => {
  it('normalizes creation values before repository access', async () => {
    const { create, repositoryLayer } = makeCreateWorkspaceRepository(() =>
      Effect.succeed(workspace)
    );

    const result = await Effect.runPromise(
      createWorkspace({
        name: '  Omoikane Development  ',
        slug: '  Omoikane-Development  ',
        description: '  Team collaboration  ',
      }).pipe(Effect.provide(repositoryLayer))
    );

    expect(result).toBe(workspace);
    expect(create).toHaveBeenCalledExactlyOnceWith({
      name: 'Omoikane Development',
      slug: 'omoikane-development',
      description: 'Team collaboration',
    });
  });

  it.each([
    ['missing description', {}, null],
    ['null description', { description: null }, null],
    ['blank description', { description: '   ' }, null],
  ])('normalizes %s to absence', async (_label, optionalInput, description) => {
    const { create, repositoryLayer } = makeCreateWorkspaceRepository(() =>
      Effect.succeed(workspace)
    );

    await Effect.runPromise(
      createWorkspace({
        name: 'Omoikane Development',
        slug: 'omoikane-development',
        ...optionalInput,
      }).pipe(Effect.provide(repositoryLayer))
    );

    expect(create).toHaveBeenCalledExactlyOnceWith({
      name: 'Omoikane Development',
      slug: 'omoikane-development',
      description,
    });
  });

  it.each([
    ['null input', null, 'name'],
    ['undefined input', undefined, 'name'],
    ['missing name', { slug: 'omoikane' }, 'name'],
    ['blank name', { name: '   ', slug: 'omoikane' }, 'name'],
    ['missing slug', { name: 'Omoikane' }, 'slug'],
    ['invalid slug', { name: 'Omoikane', slug: 'omoikane--workspace' }, 'slug'],
    [
      'non-string description',
      { name: 'Omoikane', slug: 'omoikane', description: 42 },
      'description',
    ],
  ])('rejects %s before repository access', async (_label, input, field) => {
    const { create, repositoryLayer } = makeCreateWorkspaceRepository(() =>
      Effect.succeed(workspace)
    );

    const result = await Effect.runPromise(
      createWorkspace(input).pipe(
        Effect.provide(repositoryLayer),
        Effect.either
      )
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'InvalidWorkspaceCreationInputError',
        field,
      });
    }
    expect(create).not.toHaveBeenCalled();
  });

  it('preserves a slug conflict as a typed failure', async () => {
    const failure = new WorkspaceSlugUnavailableError({
      slug: 'omoikane-development',
    });
    const { repositoryLayer } = makeCreateWorkspaceRepository(() =>
      Effect.fail(failure)
    );

    const result = await Effect.runPromise(
      createWorkspace({
        name: 'Omoikane Development',
        slug: 'omoikane-development',
      }).pipe(Effect.provide(repositoryLayer), Effect.either)
    );

    expect(result).toEqual(Either.left(failure));
  });
});
