import { Effect } from 'effect';
import type { WorkspaceRepositoryReadError } from '@chat-hub/application/workspace';
import type { Workspace } from '@chat-hub/domain/workspace';
import { mapWorkspaceRepositoryError } from '../errors';
import { mapCurrentWorkspace } from '../mapping';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';

/**
 * Lists active RLS-visible workspaces in stable display order.
 *
 * `Effect.tryPromise` converts the lazy Supabase query into an Effect and
 * translates thrown transport failures. `Effect.flatMap` observes the
 * PostgREST result only after the query succeeds, converts returned errors,
 * and decodes every external row before it can cross the infrastructure
 * boundary.
 */
export const listAccessibleWorkspaces = (
  client: SupabaseWorkspaceClient
): Effect.Effect<readonly Workspace[], WorkspaceRepositoryReadError> =>
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
    Effect.flatMap(
      ({
        data,
        error,
      }): Effect.Effect<readonly Workspace[], WorkspaceRepositoryReadError> => {
        if (error !== null) {
          return Effect.fail(mapWorkspaceRepositoryError(error));
        }

        const rows = data ?? [];

        return Effect.forEach(rows, (row) => mapCurrentWorkspace(row));
      }
    )
  );
