import { Effect, Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { WorkspaceInvitationIdSchema } from '@chat-hub/domain/workspace';
import {
  addedWorkspaceMemberRow,
  declinedWorkspaceInvitationRow,
  invitedWorkspaceMemberRow,
  makeWorkspaceCommandClientStub,
} from '../testing';
import { acceptWorkspaceInvitation } from './accept-workspace-invitation';
import { declineWorkspaceInvitation } from './decline-workspace-invitation';

const invitationId = Schema.decodeUnknownSync(WorkspaceInvitationIdSchema)(
  invitedWorkspaceMemberRow.workspace_invitation_id
);

describe('workspace invitation responses', () => {
  it('validates the active default membership returned by acceptance', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: addedWorkspaceMemberRow,
      error: null,
    });

    const member = await Effect.runPromise(
      acceptWorkspaceInvitation(stub.client, invitationId)
    );

    expect(stub.rpc).toHaveBeenCalledWith('accept_workspace_invitation', {
      p_workspace_invitation_id: invitationId,
    });
    expect(member).toMatchObject({ role: 'member' });
  });

  it('validates the declined invitation returned by decline', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: declinedWorkspaceInvitationRow,
      error: null,
    });

    await expect(
      Effect.runPromise(declineWorkspaceInvitation(stub.client, invitationId))
    ).resolves.toBeUndefined();
    expect(stub.rpc).toHaveBeenCalledWith('decline_workspace_invitation', {
      p_workspace_invitation_id: invitationId,
    });
  });

  it('maps a forbidden acceptance response', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: null,
      error: {
        code: '42501',
        message: 'Only the invited user may answer this invitation',
      },
    });

    const result = await Effect.runPromise(
      acceptWorkspaceInvitation(stub.client, invitationId).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe(
        'WorkspaceInvitationResponseNotAllowedError'
      );
    }
  });

  it('maps a forbidden decline response', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: null,
      error: {
        code: '42501',
        message: 'Only the invited user may answer this invitation',
      },
    });

    const result = await Effect.runPromise(
      declineWorkspaceInvitation(stub.client, invitationId).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe(
        'WorkspaceInvitationResponseNotAllowedError'
      );
    }
  });
});
