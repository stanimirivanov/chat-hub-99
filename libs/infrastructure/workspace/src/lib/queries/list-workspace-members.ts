import { Effect } from 'effect';
import type { WorkspaceMemberRepositoryReadError } from '@chat-hub/application/workspace';
import type { WorkspaceId, WorkspaceMember } from '@chat-hub/domain/workspace';
import { mapWorkspaceRepositoryError } from '../errors';
import { mapCurrentWorkspaceMember } from '../mapping';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';

/**
 * Lists active, RLS-visible memberships for one workspace.
 *
 * Owners precede members and profile identity provides deterministic ordering
 * inside each role. Every nullable view row is decoded before being returned.
 */
export const listWorkspaceMembers = (
  client: SupabaseWorkspaceClient,
  workspaceId: WorkspaceId
): Effect.Effect<
  readonly WorkspaceMember[],
  WorkspaceMemberRepositoryReadError
> =>
  Effect.tryPromise({
    try: () =>
      client
        .from('current_workspace_memberships')
        .select('workspace_id, user_id, membership_role')
        .eq('workspace_id', workspaceId)
        .eq('membership_status', 'active')
        .order('membership_role', { ascending: false })
        .order('user_id', { ascending: true }),
    catch: mapWorkspaceRepositoryError,
  }).pipe(
    Effect.flatMap(
      ({
        data,
        error,
      }): Effect.Effect<
        readonly WorkspaceMember[],
        WorkspaceMemberRepositoryReadError
      > => {
        if (error !== null) {
          return Effect.fail(mapWorkspaceRepositoryError(error));
        }

        return Effect.forEach(data ?? [], mapCurrentWorkspaceMember);
      }
    )
  );
