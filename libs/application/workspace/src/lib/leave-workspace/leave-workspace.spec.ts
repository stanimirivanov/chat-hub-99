import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  WorkspaceDepartureNotAllowedError,
  WorkspaceLastOwnerDepartureError,
  WorkspaceRepositoryUnavailableError,
} from '../repository';
import { makeLeaveWorkspaceRepository, workspace } from '../testing';
import { leaveWorkspace } from './leave-workspace';

describe('leaveWorkspace', () => {
  it('normalizes the workspace identity before repository access', async () => {
    const { leave, repositoryLayer } = makeLeaveWorkspaceRepository(
      () => Effect.void
    );

    const result = await Effect.runPromise(
      leaveWorkspace({ workspaceId: `  ${workspace.id}  ` }).pipe(
        Effect.provide(repositoryLayer)
      )
    );

    expect(result).toBeUndefined();
    expect(leave).toHaveBeenCalledExactlyOnceWith(workspace.id);
  });

  it.each([
    ['null input', null],
    ['undefined input', undefined],
    ['missing workspace identity', {}],
    ['null workspace identity', { workspaceId: null }],
    ['empty workspace identity', { workspaceId: '' }],
    ['blank workspace identity', { workspaceId: '   ' }],
    ['non-string workspace identity', { workspaceId: 42 }],
    ['invalid workspace identity', { workspaceId: 'not-a-workspace' }],
  ])('rejects %s before repository access', async (_label, input) => {
    const { leave, repositoryLayer } = makeLeaveWorkspaceRepository(
      () => Effect.void
    );

    const result = await Effect.runPromise(
      leaveWorkspace(input).pipe(Effect.provide(repositoryLayer), Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidWorkspaceDepartureInputError');
    }
    expect(leave).not.toHaveBeenCalled();
  });

  it.each([
    new WorkspaceDepartureNotAllowedError({ workspaceId: workspace.id }),
    new WorkspaceLastOwnerDepartureError({ workspaceId: workspace.id }),
    new WorkspaceRepositoryUnavailableError({
      cause: new Error('Provider unavailable'),
    }),
  ])('preserves the $._tag repository failure', async (failure) => {
    const { repositoryLayer } = makeLeaveWorkspaceRepository(() =>
      Effect.fail(failure)
    );

    const result = await Effect.runPromise(
      leaveWorkspace({ workspaceId: workspace.id }).pipe(
        Effect.provide(repositoryLayer),
        Effect.either
      )
    );

    expect(result).toEqual(Either.left(failure));
  });
});
