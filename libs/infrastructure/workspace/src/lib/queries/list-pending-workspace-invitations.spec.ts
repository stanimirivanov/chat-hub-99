import { Effect } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';
import { pendingWorkspaceInvitationRows } from '../testing';
import { listPendingWorkspaceInvitations } from './list-pending-workspace-invitations';

const makeClient = (result: {
  readonly data: typeof pendingWorkspaceInvitationRows | null;
  readonly error: { readonly code: string; readonly message: string } | null;
}) => {
  const rpc = vi.fn().mockResolvedValue(result);
  return { client: { rpc } as unknown as SupabaseWorkspaceClient, rpc };
};

describe('listPendingWorkspaceInvitations', () => {
  it('executes the recipient RPC and validates invitation and workspace data', async () => {
    const stub = makeClient({
      data: pendingWorkspaceInvitationRows,
      error: null,
    });

    const result = await Effect.runPromise(
      listPendingWorkspaceInvitations(stub.client)
    );

    expect(stub.rpc).toHaveBeenCalledExactlyOnceWith(
      'list_pending_workspace_invitations'
    );
    expect(result).toMatchObject([
      {
        invitation: { status: 'pending' },
        workspace: { name: 'Chat Hub Development' },
      },
    ]);
  });

  it('rejects malformed provider rows', async () => {
    const stub = makeClient({
      data: [
        {
          ...pendingWorkspaceInvitationRows[0],
          workspace_slug: 'Not Valid',
        },
      ],
      error: null,
    });

    const result = await Effect.runPromise(
      listPendingWorkspaceInvitations(stub.client).pipe(Effect.either)
    );
    expect(result).toMatchObject({
      _tag: 'Left',
      left: { _tag: 'InvalidWorkspaceInvitationDataError' },
    });
  });

  it('translates provider errors', async () => {
    const stub = makeClient({
      data: null,
      error: { code: '08006', message: 'offline' },
    });

    const result = await Effect.runPromise(
      listPendingWorkspaceInvitations(stub.client).pipe(Effect.either)
    );
    expect(result).toMatchObject({
      _tag: 'Left',
      left: { _tag: 'WorkspaceRepositoryUnavailableError' },
    });
  });
});
