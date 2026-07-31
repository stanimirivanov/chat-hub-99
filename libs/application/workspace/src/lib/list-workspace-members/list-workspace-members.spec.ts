import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import { WorkspaceRepositoryUnavailableError } from '../repository';
import {
  makeListWorkspaceMembersRepository,
  workspace,
  workspaceMember,
} from '../testing';
import { listWorkspaceMembers } from './list-workspace-members';

describe('listWorkspaceMembers', () => {
  it('delegates selected-workspace discovery to the repository', async () => {
    const members = [workspaceMember];
    const { listActiveMembers, repositoryLayer } =
      makeListWorkspaceMembersRepository(() => Effect.succeed(members));

    const result = await Effect.runPromise(
      listWorkspaceMembers(workspace.id).pipe(Effect.provide(repositoryLayer))
    );

    expect(result).toBe(members);
    expect(listActiveMembers).toHaveBeenCalledExactlyOnceWith(workspace.id);
  });

  it('preserves the repository failure channel', async () => {
    const failure = new WorkspaceRepositoryUnavailableError({
      cause: new Error('Provider unavailable'),
    });
    const { repositoryLayer } = makeListWorkspaceMembersRepository(() =>
      Effect.fail(failure)
    );

    const result = await Effect.runPromise(
      listWorkspaceMembers(workspace.id).pipe(
        Effect.provide(repositoryLayer),
        Effect.either
      )
    );

    expect(result).toEqual(Either.left(failure));
  });
});
