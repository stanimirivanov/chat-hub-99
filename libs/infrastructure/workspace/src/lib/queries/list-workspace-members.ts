import { Effect } from 'effect';
import type {
  ListActiveWorkspaceMembersQuery,
  WorkspaceMemberCursor,
  WorkspaceMemberPage,
  WorkspaceMemberRepositoryReadError,
} from '@omoikane/application/workspace';
import type { WorkspaceMember } from '@omoikane/domain/workspace';
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
  query: ListActiveWorkspaceMembersQuery
): Effect.Effect<WorkspaceMemberPage, WorkspaceMemberRepositoryReadError> =>
  Effect.tryPromise({
    try: () => {
      let databaseQuery = client
        .from('current_workspace_memberships')
        .select('workspace_id, user_id, membership_role')
        .eq('workspace_id', query.workspaceId)
        .eq('membership_status', 'active')
        .order('membership_role', { ascending: false })
        .order('user_id', { ascending: true })
        .limit(Number(query.limit) + 1);

      if (query.after !== undefined) {
        databaseQuery = databaseQuery.or(
          toAfterMemberCursorFilter(query.after)
        );
      }

      return databaseQuery;
    },
    catch: mapWorkspaceRepositoryError,
  }).pipe(
    Effect.flatMap(
      ({
        data,
        error,
      }): Effect.Effect<
        WorkspaceMemberPage,
        WorkspaceMemberRepositoryReadError
      > => {
        if (error !== null) {
          return Effect.fail(mapWorkspaceRepositoryError(error));
        }

        return Effect.forEach(data ?? [], mapCurrentWorkspaceMember).pipe(
          Effect.map((members) =>
            buildWorkspaceMemberPage(members, query.limit)
          )
        );
      }
    )
  );

/** Builds a strict owner-first compound cursor filter for PostgREST. */
export const toAfterMemberCursorFilter = (
  cursor: WorkspaceMemberCursor
): string =>
  `membership_role.lt.${cursor.role},and(membership_role.eq.${cursor.role},user_id.gt.${cursor.profileId})`;

/** Removes the look-ahead row and derives the following page cursor. */
export const buildWorkspaceMemberPage = (
  mappedMembers: readonly WorkspaceMember[],
  requestedLimit: number
): WorkspaceMemberPage => {
  const hasNextPage = mappedMembers.length > requestedLimit;
  const members = mappedMembers.slice(0, requestedLimit);
  const lastMember = members[members.length - 1];

  return {
    members,
    nextCursor:
      hasNextPage && lastMember !== undefined
        ? { role: lastMember.role, profileId: lastMember.profileId }
        : null,
  };
};
