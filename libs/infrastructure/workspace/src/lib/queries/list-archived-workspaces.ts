import { Effect } from 'effect';
import type { WorkspaceRepositoryReadError } from '@omoikane/application/workspace';
import type { ArchivedWorkspace } from '@omoikane/domain/workspace';
import { mapWorkspaceRepositoryError } from '../errors';
import { mapArchivedWorkspace } from '../mapping';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';

/** Lists archived RLS-visible workspaces from newest to oldest archive. */
export const listArchivedWorkspaces = (
  client: SupabaseWorkspaceClient
): Effect.Effect<readonly ArchivedWorkspace[], WorkspaceRepositoryReadError> =>
  Effect.tryPromise({
    try: () =>
      client
        .from('current_workspaces')
        .select('workspace_id, name, slug, description, version_created_at')
        .eq('status', 'archived')
        .order('version_created_at', { ascending: false })
        .order('workspace_id', { ascending: true }),
    catch: mapWorkspaceRepositoryError,
  }).pipe(
    Effect.flatMap(
      ({
        data,
        error,
      }): Effect.Effect<
        readonly ArchivedWorkspace[],
        WorkspaceRepositoryReadError
      > => {
        if (error !== null) {
          return Effect.fail(mapWorkspaceRepositoryError(error));
        }

        return Effect.forEach(data ?? [], (row) => mapArchivedWorkspace(row));
      }
    )
  );
