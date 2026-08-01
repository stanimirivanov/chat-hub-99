import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  WorkspaceSlugUnavailableError,
  WorkspaceUpdateNotAllowedError,
} from '../repository';
import { makeUpdateWorkspaceRepository, workspace } from '../testing';
import { updateWorkspace } from './update-workspace';

describe('updateWorkspace', () => {
  it('normalizes replacement details before repository access', async () => {
    const updatedWorkspace = {
      ...workspace,
      name: 'Chat Hub Community',
      slug: 'chat-hub-community',
      description: 'Team collaboration',
    };
    const { update, repositoryLayer } = makeUpdateWorkspaceRepository(() =>
      Effect.succeed(updatedWorkspace)
    );

    const result = await Effect.runPromise(
      updateWorkspace({
        workspaceId: `  ${workspace.id}  `,
        name: '  Chat Hub Community  ',
        slug: '  Chat-Hub-Community  ',
        description: '  Team collaboration  ',
      }).pipe(Effect.provide(repositoryLayer))
    );

    expect(result).toBe(updatedWorkspace);
    expect(update).toHaveBeenCalledExactlyOnceWith({
      workspaceId: workspace.id,
      name: 'Chat Hub Community',
      slug: 'chat-hub-community',
      description: 'Team collaboration',
    });
  });

  it.each([
    ['missing description', {}, null],
    ['null description', { description: null }, null],
    ['blank description', { description: '   ' }, null],
  ])('normalizes %s to absence', async (_label, optionalInput, description) => {
    const { update, repositoryLayer } = makeUpdateWorkspaceRepository(() =>
      Effect.succeed(workspace)
    );

    await Effect.runPromise(
      updateWorkspace({
        workspaceId: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        ...optionalInput,
      }).pipe(Effect.provide(repositoryLayer))
    );

    expect(update).toHaveBeenCalledExactlyOnceWith({
      workspaceId: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description,
    });
  });

  it.each([
    ['null input', null, 'workspaceId'],
    ['undefined input', undefined, 'workspaceId'],
    [
      'invalid workspace identity',
      { workspaceId: 'not-a-workspace', name: 'Chat Hub', slug: 'chat-hub' },
      'workspaceId',
    ],
    ['missing name', { workspaceId: workspace.id, slug: 'chat-hub' }, 'name'],
    [
      'blank name',
      { workspaceId: workspace.id, name: '   ', slug: 'chat-hub' },
      'name',
    ],
    ['missing slug', { workspaceId: workspace.id, name: 'Chat Hub' }, 'slug'],
    [
      'invalid slug',
      { workspaceId: workspace.id, name: 'Chat Hub', slug: 'chat--hub' },
      'slug',
    ],
    [
      'non-string description',
      {
        workspaceId: workspace.id,
        name: 'Chat Hub',
        slug: 'chat-hub',
        description: 42,
      },
      'description',
    ],
  ])('rejects %s before repository access', async (_label, input, field) => {
    const { update, repositoryLayer } = makeUpdateWorkspaceRepository(() =>
      Effect.succeed(workspace)
    );

    const result = await Effect.runPromise(
      updateWorkspace(input).pipe(
        Effect.provide(repositoryLayer),
        Effect.either
      )
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'InvalidWorkspaceUpdateInputError',
        field,
      });
    }
    expect(update).not.toHaveBeenCalled();
  });

  it.each([
    new WorkspaceSlugUnavailableError({ slug: 'chat-hub-community' }),
    new WorkspaceUpdateNotAllowedError({ workspaceId: workspace.id }),
  ])('preserves the $._tag repository failure', async (failure) => {
    const { repositoryLayer } = makeUpdateWorkspaceRepository(() =>
      Effect.fail(failure)
    );

    const result = await Effect.runPromise(
      updateWorkspace({
        workspaceId: workspace.id,
        name: 'Chat Hub Community',
        slug: 'chat-hub-community',
      }).pipe(Effect.provide(repositoryLayer), Effect.either)
    );

    expect(result).toEqual(Either.left(failure));
  });
});
