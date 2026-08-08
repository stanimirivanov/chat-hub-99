import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  WorkspaceRepositoryUnavailableError,
  WorkspaceRestoreNotAllowedError,
} from '../repository';
import { makeRestoreWorkspaceRepository, workspace } from '../testing';
import { restoreWorkspace } from './restore-workspace';

describe('restoreWorkspace', () => {
  it('normalizes the identity and returns the restored active workspace', async () => {
    const { restore, repositoryLayer } = makeRestoreWorkspaceRepository(() =>
      Effect.succeed(workspace)
    );

    const result = await Effect.runPromise(
      restoreWorkspace({ workspaceId: `  ${workspace.id}  ` }).pipe(
        Effect.provide(repositoryLayer)
      )
    );

    expect(result).toEqual(workspace);
    expect(restore).toHaveBeenCalledExactlyOnceWith(workspace.id);
  });

  it.each([
    ['null input', null],
    ['undefined input', undefined],
    ['missing workspace identity', {}],
    ['null workspace identity', { workspaceId: null }],
    ['blank workspace identity', { workspaceId: '   ' }],
    ['non-string workspace identity', { workspaceId: 42 }],
    ['invalid workspace identity', { workspaceId: 'not-a-workspace' }],
  ])('rejects %s before repository access', async (_label, input) => {
    const { restore, repositoryLayer } = makeRestoreWorkspaceRepository(() =>
      Effect.succeed(workspace)
    );

    const result = await Effect.runPromise(
      restoreWorkspace(input).pipe(
        Effect.provide(repositoryLayer),
        Effect.either
      )
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidWorkspaceRestoreInputError');
    }
    expect(restore).not.toHaveBeenCalled();
  });

  it.each([
    new WorkspaceRestoreNotAllowedError({ workspaceId: workspace.id }),
    new WorkspaceRepositoryUnavailableError({ cause: 'offline' }),
  ])('preserves the $._tag repository failure', async (failure) => {
    const { repositoryLayer } = makeRestoreWorkspaceRepository(() =>
      Effect.fail(failure)
    );

    const result = await Effect.runPromise(
      restoreWorkspace({ workspaceId: workspace.id }).pipe(
        Effect.provide(repositoryLayer),
        Effect.either
      )
    );

    expect(result).toEqual(Either.left(failure));
  });
});
