import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import { WorkspaceRepositoryUnavailableError } from '../repository';
import {
  makeListPendingWorkspaceInvitationsRepository,
  workspace,
  workspaceInvitation,
} from '../testing';
import { listPendingWorkspaceInvitations } from './list-pending-workspace-invitations';

describe('listPendingWorkspaceInvitations', () => {
  it('returns the repository recipient projection', async () => {
    const invitations = [{ invitation: workspaceInvitation, workspace }];
    const { listPendingInvitations, repositoryLayer } =
      makeListPendingWorkspaceInvitationsRepository(() =>
        Effect.succeed(invitations)
      );

    await expect(
      Effect.runPromise(
        listPendingWorkspaceInvitations.pipe(Effect.provide(repositoryLayer))
      )
    ).resolves.toEqual(invitations);
    expect(listPendingInvitations).toHaveBeenCalledOnce();
  });

  it('preserves repository failures', async () => {
    const failure = new WorkspaceRepositoryUnavailableError({
      cause: 'offline',
    });
    const { repositoryLayer } = makeListPendingWorkspaceInvitationsRepository(
      () => Effect.fail(failure)
    );

    await expect(
      Effect.runPromise(
        listPendingWorkspaceInvitations.pipe(
          Effect.provide(repositoryLayer),
          Effect.either
        )
      )
    ).resolves.toEqual(Either.left(failure));
  });
});
