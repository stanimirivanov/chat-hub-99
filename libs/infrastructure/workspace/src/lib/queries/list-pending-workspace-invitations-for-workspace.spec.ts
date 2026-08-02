import { Effect, Schema } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceIdSchema } from '@chat-hub/domain/workspace';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';
import { pendingWorkspaceInvitationForOwnerRows } from '../testing';
import { listPendingWorkspaceInvitationsForWorkspace } from './list-pending-workspace-invitations-for-workspace';

const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  pendingWorkspaceInvitationForOwnerRows[0].workspace_id
);

const makeClient = (result: {
  readonly data: typeof pendingWorkspaceInvitationForOwnerRows | null;
  readonly error: { readonly code: string; readonly message: string } | null;
}) => {
  const rpc = vi.fn().mockResolvedValue(result);
  return { client: { rpc } as unknown as SupabaseWorkspaceClient, rpc };
};

describe('listPendingWorkspaceInvitationsForWorkspace', () => {
  it('executes the owner RPC and validates current username presentation', async () => {
    const stub = makeClient({
      data: pendingWorkspaceInvitationForOwnerRows,
      error: null,
    });

    const result = await Effect.runPromise(
      listPendingWorkspaceInvitationsForWorkspace(stub.client, workspaceId)
    );

    expect(stub.rpc).toHaveBeenCalledExactlyOnceWith(
      'list_pending_workspace_invitations_for_workspace',
      { p_workspace_id: workspaceId }
    );
    expect(result).toMatchObject([
      { invitation: { status: 'pending' }, username: 'candidate' },
    ]);
  });

  it('rejects malformed current usernames', async () => {
    const stub = makeClient({
      data: [
        { ...pendingWorkspaceInvitationForOwnerRows[0], invited_username: '' },
      ],
      error: null,
    });

    const result = await Effect.runPromise(
      listPendingWorkspaceInvitationsForWorkspace(
        stub.client,
        workspaceId
      ).pipe(Effect.either)
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: { _tag: 'InvalidWorkspaceInvitationDataError' },
    });
  });

  it('maps forbidden owner access to a stable failure', async () => {
    const stub = makeClient({
      data: null,
      error: { code: '42501', message: 'Only owners may list invitations' },
    });

    const result = await Effect.runPromise(
      listPendingWorkspaceInvitationsForWorkspace(
        stub.client,
        workspaceId
      ).pipe(Effect.either)
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: { _tag: 'WorkspaceInvitationManagementNotAllowedError' },
    });
  });
});
