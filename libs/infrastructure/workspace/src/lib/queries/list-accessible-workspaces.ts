import { Effect } from 'effect';
import type { WorkspaceRepositoryError } from '@chat-hub/application/workspace';
import type { Workspace } from '@chat-hub/domain/workspace';
import { mapWorkspaceRepositoryError } from '../errors';
import { mapCurrentWorkspace } from '../mapping';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';

/**
 * Lists active RLS-visible workspaces in stable display order.
 */
export const listAccessibleWorkspaces = (
  client: SupabaseWorkspaceClient
): Effect.Effect<readonly Workspace[], WorkspaceRepositoryError> =>
  Effect.tryPromise({
    try: () =>
      client
        .from('current_workspaces')
        .select('workspace_id, name, slug, description')
        .eq('status', 'active')
        .order('name', { ascending: true })
        .order('workspace_id', { ascending: true }),
    catch: mapWorkspaceRepositoryError,
  }).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error !== null) {
        return Effect.fail(mapWorkspaceRepositoryError(error));
      }

      const rows = data ?? [];

      return Effect.forEach(rows, (row) => mapCurrentWorkspace(row));
    })
  );
