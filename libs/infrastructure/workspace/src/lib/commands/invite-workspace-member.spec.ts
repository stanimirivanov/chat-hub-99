import { Effect, Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import type { InviteWorkspaceMemberCommand } from '@omoikane/application/workspace';
import { ProfileIdSchema } from '@omoikane/domain/profile';
import { WorkspaceIdSchema } from '@omoikane/domain/workspace';
import {
  invitedWorkspaceMemberRow,
  makeWorkspaceCommandClientStub,
} from '../testing';
import { inviteWorkspaceMember } from './invite-workspace-member';

const command: InviteWorkspaceMemberCommand = {
  workspaceId: Schema.decodeUnknownSync(WorkspaceIdSchema)(
    invitedWorkspaceMemberRow.workspace_id
  ),
  profileId: Schema.decodeUnknownSync(ProfileIdSchema)(
    invitedWorkspaceMemberRow.invited_user_id
  ),
};

describe('inviteWorkspaceMember', () => {
  it('executes the invitation RPC and validates its pending projection', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: invitedWorkspaceMemberRow,
      error: null,
    });

    const invitation = await Effect.runPromise(
      inviteWorkspaceMember(stub.client, command)
    );

    expect(stub.rpc).toHaveBeenCalledWith('invite_workspace_member', {
      p_workspace_id: command.workspaceId,
      p_user_id: command.profileId,
    });
    expect(invitation).toMatchObject({
      workspaceId: command.workspaceId,
      invitedProfileId: command.profileId,
      status: 'pending',
    });
  });

  it.each([
    [
      '42501',
      'Only an active workspace owner may invite members',
      'WorkspaceInvitationCreationNotAllowedError',
    ],
    [
      '55000',
      `User ${command.profileId} is already an active workspace member`,
      'WorkspaceInvitationMemberAlreadyActiveError',
    ],
    [
      '55000',
      `User ${command.profileId} already has a pending workspace invitation`,
      'WorkspaceInvitationAlreadyPendingError',
    ],
  ])('maps %s failures to %s', async (code, message, tag) => {
    const stub = makeWorkspaceCommandClientStub({
      data: null,
      error: { code, message },
    });

    const result = await Effect.runPromise(
      inviteWorkspaceMember(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe(tag);
    }
  });

  it('rejects a non-pending result', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: { ...invitedWorkspaceMemberRow, invitation_status: 'accepted' },
      error: null,
    });

    const result = await Effect.runPromise(
      inviteWorkspaceMember(stub.client, command).pipe(Effect.either)
    );
    expect(result).toMatchObject({
      _tag: 'Left',
      left: { _tag: 'InvalidWorkspaceInvitationDataError' },
    });
  });
});
