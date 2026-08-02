import { Effect, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { WorkspaceInvitationIdSchema } from '@chat-hub/domain/workspace';
import {
  cancelledWorkspaceInvitationRow,
  invitedWorkspaceMemberRow,
  makeWorkspaceCommandClientStub,
} from '../testing';
import { cancelWorkspaceInvitation } from './cancel-workspace-invitation';

const invitationId = Schema.decodeUnknownSync(WorkspaceInvitationIdSchema)(
  invitedWorkspaceMemberRow.workspace_invitation_id
);

describe('cancelWorkspaceInvitation', () => {
  it('validates the cancelled projection returned by the RPC', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: cancelledWorkspaceInvitationRow,
      error: null,
    });

    await expect(
      Effect.runPromise(cancelWorkspaceInvitation(stub.client, invitationId))
    ).resolves.toBeUndefined();
    expect(stub.rpc).toHaveBeenCalledWith('cancel_workspace_invitation', {
      p_workspace_invitation_id: invitationId,
    });
  });

  it('rejects a mismatched provider projection', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: {
        ...cancelledWorkspaceInvitationRow,
        invitation_status: 'pending',
      },
      error: null,
    });

    const result = await Effect.runPromise(
      cancelWorkspaceInvitation(stub.client, invitationId).pipe(Effect.either)
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: { _tag: 'InvalidWorkspaceInvitationDataError' },
    });
  });

  it('maps forbidden cancellation to a stable failure', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: null,
      error: { code: '42501', message: 'Only owners may cancel invitations' },
    });

    const result = await Effect.runPromise(
      cancelWorkspaceInvitation(stub.client, invitationId).pipe(Effect.either)
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: { _tag: 'WorkspaceInvitationCancellationNotAllowedError' },
    });
  });
});
