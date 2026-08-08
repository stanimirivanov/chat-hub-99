import { Effect } from 'effect';
import type {
  PendingWorkspaceInvitation,
  WorkspaceInvitationRepositoryReadError,
} from '@omoikane/application/workspace';
import type { ListPendingWorkspaceInvitationsResult } from '@omoikane/shared/database';
import { mapWorkspaceRepositoryError } from '../errors';
import { mapPendingWorkspaceInvitation } from '../mapping';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';

/** Lists and validates pending invitations for the authenticated recipient. */
export const listPendingWorkspaceInvitations = (
  client: SupabaseWorkspaceClient
): Effect.Effect<
  readonly PendingWorkspaceInvitation[],
  WorkspaceInvitationRepositoryReadError
> =>
  Effect.tryPromise({
    try: () => client.rpc('list_pending_workspace_invitations'),
    catch: mapWorkspaceRepositoryError,
  }).pipe(
    Effect.flatMap(
      ({
        data,
        error,
      }): Effect.Effect<
        readonly PendingWorkspaceInvitation[],
        WorkspaceInvitationRepositoryReadError
      > => {
        if (error !== null) {
          return Effect.fail(mapWorkspaceRepositoryError(error));
        }

        const rows: ListPendingWorkspaceInvitationsResult = data ?? [];

        return Effect.forEach(rows, mapPendingWorkspaceInvitation);
      }
    )
  );
