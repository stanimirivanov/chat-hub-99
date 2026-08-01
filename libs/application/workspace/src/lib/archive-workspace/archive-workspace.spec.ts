import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  WorkspaceArchiveNotAllowedError,
  WorkspaceRepositoryUnavailableError,
} from '../repository';
import { makeArchiveWorkspaceRepository, workspace } from '../testing';
import { archiveWorkspace } from './archive-workspace';

describe('archiveWorkspace', () => {
  it('normalizes the workspace identity before repository access', async () => {
    const { archive, repositoryLayer } = makeArchiveWorkspaceRepository(() =>
      Effect.succeed(undefined)
    );

    const result = await Effect.runPromise(
      archiveWorkspace({ workspaceId: `  ${workspace.id}  ` }).pipe(
        Effect.provide(repositoryLayer)
      )
    );

    expect(result).toBeUndefined();
    expect(archive).toHaveBeenCalledExactlyOnceWith(workspace.id);
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
    const { archive, repositoryLayer } = makeArchiveWorkspaceRepository(() =>
      Effect.succeed(undefined)
    );

    const result = await Effect.runPromise(
      archiveWorkspace(input).pipe(
        Effect.provide(repositoryLayer),
        Effect.either
      )
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidWorkspaceArchiveInputError');
    }
    expect(archive).not.toHaveBeenCalled();
  });

  it.each([
    new WorkspaceArchiveNotAllowedError({ workspaceId: workspace.id }),
    new WorkspaceRepositoryUnavailableError({
      cause: new Error('Provider unavailable'),
    }),
  ])('preserves the $._tag repository failure', async (failure) => {
    const { repositoryLayer } = makeArchiveWorkspaceRepository(() =>
      Effect.fail(failure)
    );

    const result = await Effect.runPromise(
      archiveWorkspace({ workspaceId: workspace.id }).pipe(
        Effect.provide(repositoryLayer),
        Effect.either
      )
    );

    expect(result).toEqual(Either.left(failure));
  });
});
