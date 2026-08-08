import { Effect } from 'effect';
import {
  InvalidWorkspaceDataError,
  type WorkspaceRepositoryRestoreError,
} from '@chat-hub/application/workspace';
import type { Workspace, WorkspaceId } from '@chat-hub/domain/workspace';
import type { RestoreWorkspaceResult } from '@chat-hub/shared/database';
import {
  mapWorkspaceRepositoryError,
  mapWorkspaceRestoreError,
} from '../errors';
import { mapCurrentWorkspace, toRestoreWorkspaceArgs } from '../mapping';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';

/** Executes restoration and validates the returned active workspace version. */
export const restoreWorkspace = (
  client: SupabaseWorkspaceClient,
  workspaceId: WorkspaceId
): Effect.Effect<Workspace, WorkspaceRepositoryRestoreError> =>
  Effect.tryPromise({
    try: () =>
      client.rpc('restore_workspace', toRestoreWorkspaceArgs(workspaceId)),
    catch: mapWorkspaceRepositoryError,
  }).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error !== null) {
        return Effect.fail(mapWorkspaceRestoreError(workspaceId, error));
      }

      return mapRestoreResult(data, workspaceId);
    })
  );

const mapRestoreResult = (
  result: RestoreWorkspaceResult | null,
  workspaceId: WorkspaceId
): Effect.Effect<Workspace, InvalidWorkspaceDataError> => {
  if (
    result === null ||
    result.workspace_id !== workspaceId ||
    result.status !== 'active'
  ) {
    return Effect.fail(
      new InvalidWorkspaceDataError({
        cause:
          'Workspace restoration returned no matching active workspace version.',
      })
    );
  }

  return mapCurrentWorkspace(result);
};
