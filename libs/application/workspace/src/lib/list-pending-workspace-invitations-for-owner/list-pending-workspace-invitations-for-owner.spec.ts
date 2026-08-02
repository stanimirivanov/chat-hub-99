import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import { WorkspaceInvitationManagementNotAllowedError } from '../repository';
import {
  makeListPendingWorkspaceInvitationsForOwnerRepository,
  workspace,
  workspaceInvitation,
} from '../testing';
import { listPendingWorkspaceInvitationsForOwner } from './list-pending-workspace-invitations-for-owner';

describe('listPendingWorkspaceInvitationsForOwner', () => {
  it('validates and forwards the selected workspace identity', async () => {
    const invitations = [
      { invitation: workspaceInvitation, username: 'candidate' },
    ];
    const { listPendingInvitationsForWorkspace, repositoryLayer } =
      makeListPendingWorkspaceInvitationsForOwnerRepository(() =>
        Effect.succeed(invitations)
      );

    await expect(
      Effect.runPromise(
        listPendingWorkspaceInvitationsForOwner({
          workspaceId: ` ${workspace.id} `,
        }).pipe(Effect.provide(repositoryLayer))
      )
    ).resolves.toEqual(invitations);
    expect(listPendingInvitationsForWorkspace).toHaveBeenCalledWith(
      workspace.id
    );
  });

  it('rejects invalid input before repository access', async () => {
    const { listPendingInvitationsForWorkspace, repositoryLayer } =
      makeListPendingWorkspaceInvitationsForOwnerRepository(() =>
        Effect.succeed([])
      );

    const result = await Effect.runPromise(
      listPendingWorkspaceInvitationsForOwner({ workspaceId: '' }).pipe(
        Effect.provide(repositoryLayer),
        Effect.either
      )
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: { _tag: 'InvalidWorkspaceInvitationOwnerListInputError' },
    });
    expect(listPendingInvitationsForWorkspace).not.toHaveBeenCalled();
  });

  it('preserves owner-authorization failures', async () => {
    const failure = new WorkspaceInvitationManagementNotAllowedError({
      workspaceId: workspace.id,
    });
    const { repositoryLayer } =
      makeListPendingWorkspaceInvitationsForOwnerRepository(() =>
        Effect.fail(failure)
      );

    await expect(
      Effect.runPromise(
        listPendingWorkspaceInvitationsForOwner({
          workspaceId: workspace.id,
        }).pipe(Effect.provide(repositoryLayer), Effect.either)
      )
    ).resolves.toEqual(Either.left(failure));
  });
});
