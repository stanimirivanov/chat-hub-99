import { Effect } from 'effect';
import {
  InvalidWorkspaceMemberDataError,
  type WorkspaceDepartureRepositoryError,
} from '@chat-hub/application/workspace';
import type { WorkspaceId } from '@chat-hub/domain/workspace';
import type { LeaveWorkspaceResult } from '@chat-hub/shared/database';
import {
  mapWorkspaceDepartureError,
  mapWorkspaceRepositoryError,
} from '../errors';
import { toLeaveWorkspaceArgs } from '../mapping';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';

/**
 * Executes self-departure and validates the canonical removed membership
 * before acknowledging success. The target identity remains session-derived.
 */
export const leaveWorkspace = (
  client: SupabaseWorkspaceClient,
  workspaceId: WorkspaceId
): Effect.Effect<void, WorkspaceDepartureRepositoryError> =>
  Effect.tryPromise({
    try: () => client.rpc('leave_workspace', toLeaveWorkspaceArgs(workspaceId)),
    catch: mapWorkspaceRepositoryError,
  }).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error !== null) {
        return Effect.fail(mapWorkspaceDepartureError(workspaceId, error));
      }

      return validateDepartureResult(data, workspaceId);
    })
  );

const validateDepartureResult = (
  result: LeaveWorkspaceResult | null,
  workspaceId: WorkspaceId
): Effect.Effect<void, InvalidWorkspaceMemberDataError> => {
  if (
    result === null ||
    result.membership_status !== 'removed' ||
    result.workspace_id !== workspaceId
  ) {
    return Effect.fail(
      new InvalidWorkspaceMemberDataError({
        cause:
          'Workspace departure returned no matching removed membership projection.',
      })
    );
  }

  return Effect.void;
};
