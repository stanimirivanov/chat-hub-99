import { Effect } from 'effect';
import type {
  PendingWorkspaceInvitationForOwner,
  WorkspaceInvitationOwnerRepositoryReadError,
} from '@omoikane/application/workspace';
import type { WorkspaceId } from '@omoikane/domain/workspace';
import type { ListPendingWorkspaceInvitationsForWorkspaceResult } from '@omoikane/shared/database';
import {
  mapWorkspaceInvitationOwnerReadError,
  mapWorkspaceRepositoryError,
} from '../errors';
import {
  mapPendingWorkspaceInvitationForOwner,
  toListPendingWorkspaceInvitationsForWorkspaceArgs,
} from '../mapping';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';

/** Lists and validates pending invitations managed by one active owner. */
export const listPendingWorkspaceInvitationsForWorkspace = (
  client: SupabaseWorkspaceClient,
  workspaceId: WorkspaceId
): Effect.Effect<
  readonly PendingWorkspaceInvitationForOwner[],
  WorkspaceInvitationOwnerRepositoryReadError
> =>
  Effect.tryPromise({
    try: () =>
      client.rpc(
        'list_pending_workspace_invitations_for_workspace',
        toListPendingWorkspaceInvitationsForWorkspaceArgs(workspaceId)
      ),
    catch: mapWorkspaceRepositoryError,
  }).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error !== null) {
        return Effect.fail(
          mapWorkspaceInvitationOwnerReadError(workspaceId, error)
        );
      }

      const rows: ListPendingWorkspaceInvitationsForWorkspaceResult =
        data ?? [];
      return Effect.forEach(rows, mapPendingWorkspaceInvitationForOwner);
    })
  );
