import { Effect } from 'effect';
import {
  InvalidWorkspaceDataError,
  type UpdateWorkspaceCommand,
  type WorkspaceRepositoryUpdateError,
} from '@omoikane/application/workspace';
import type { Workspace } from '@omoikane/domain/workspace';
import type { UpdateWorkspaceResult } from '@omoikane/shared/database';
import {
  mapWorkspaceRepositoryError,
  mapWorkspaceUpdateError,
} from '../errors';
import { mapCurrentWorkspace, toUpdateWorkspaceArgs } from '../mapping';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';

/**
 * Executes the transactional workspace-update RPC and validates the returned
 * active version before it crosses the adapter boundary.
 */
export const updateWorkspace = (
  client: SupabaseWorkspaceClient,
  command: UpdateWorkspaceCommand
): Effect.Effect<Workspace, WorkspaceRepositoryUpdateError> =>
  Effect.tryPromise({
    try: () => client.rpc('update_workspace', toUpdateWorkspaceArgs(command)),
    catch: mapWorkspaceRepositoryError,
  }).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error !== null) {
        return Effect.fail(mapWorkspaceUpdateError(command, error));
      }

      return mapUpdateResult(data, command);
    })
  );

const mapUpdateResult = (
  result: UpdateWorkspaceResult | null,
  command: UpdateWorkspaceCommand
): Effect.Effect<Workspace, InvalidWorkspaceDataError> => {
  if (
    result === null ||
    result.workspace_id !== command.workspaceId ||
    result.status !== 'active'
  ) {
    return Effect.fail(
      new InvalidWorkspaceDataError({
        cause:
          'Workspace update returned no matching active workspace version.',
      })
    );
  }

  return mapCurrentWorkspace(result);
};
