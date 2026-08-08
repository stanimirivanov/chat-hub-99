import { Effect } from 'effect';
import {
  InvalidWorkspaceDataError,
  type WorkspaceRepositoryArchiveError,
} from '@omoikane/application/workspace';
import type { WorkspaceId } from '@omoikane/domain/workspace';
import type { ArchiveWorkspaceResult } from '@omoikane/shared/database';
import {
  mapWorkspaceArchiveError,
  mapWorkspaceRepositoryError,
} from '../errors';
import { toArchiveWorkspaceArgs } from '../mapping';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';

/**
 * Executes the transactional archive RPC and validates its archived identity
 * before acknowledging success without exposing an inactive domain workspace.
 */
export const archiveWorkspace = (
  client: SupabaseWorkspaceClient,
  workspaceId: WorkspaceId
): Effect.Effect<void, WorkspaceRepositoryArchiveError> =>
  Effect.tryPromise({
    try: () =>
      client.rpc('archive_workspace', toArchiveWorkspaceArgs(workspaceId)),
    catch: mapWorkspaceRepositoryError,
  }).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error !== null) {
        return Effect.fail(mapWorkspaceArchiveError(workspaceId, error));
      }

      return validateArchiveResult(data, workspaceId);
    })
  );

const validateArchiveResult = (
  result: ArchiveWorkspaceResult | null,
  workspaceId: WorkspaceId
): Effect.Effect<void, InvalidWorkspaceDataError> =>
  result !== null &&
  result.workspace_id === workspaceId &&
  result.status === 'archived'
    ? Effect.succeed(undefined)
    : Effect.fail(
        new InvalidWorkspaceDataError({
          cause:
            'Workspace archive returned no matching archived workspace version.',
        })
      );
