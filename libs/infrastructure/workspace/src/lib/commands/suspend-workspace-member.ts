import { Effect } from 'effect';
import {
  InvalidWorkspaceMemberDataError,
  type SuspendWorkspaceMemberCommand,
  type WorkspaceMemberSuspensionRepositoryError,
} from '@omoikane/application/workspace';
import type { SuspendWorkspaceMemberResult } from '@omoikane/shared/database';
import {
  mapWorkspaceMemberSuspensionError,
  mapWorkspaceRepositoryError,
} from '../errors';
import { toSuspendWorkspaceMemberArgs } from '../mapping';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';

/**
 * Executes the suspension RPC and validates that the canonical result names
 * the requested membership in the suspended state.
 */
export const suspendWorkspaceMember = (
  client: SupabaseWorkspaceClient,
  command: SuspendWorkspaceMemberCommand
): Effect.Effect<void, WorkspaceMemberSuspensionRepositoryError> =>
  Effect.tryPromise({
    try: () =>
      client.rpc(
        'suspend_workspace_member',
        toSuspendWorkspaceMemberArgs(command)
      ),
    catch: mapWorkspaceRepositoryError,
  }).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error !== null) {
        return Effect.fail(mapWorkspaceMemberSuspensionError(command, error));
      }

      return validateSuspensionResult(data, command);
    })
  );

const validateSuspensionResult = (
  result: SuspendWorkspaceMemberResult | null,
  command: SuspendWorkspaceMemberCommand
): Effect.Effect<void, InvalidWorkspaceMemberDataError> => {
  if (
    result === null ||
    result.membership_status !== 'suspended' ||
    result.workspace_id !== command.workspaceId ||
    result.user_id !== command.profileId
  ) {
    return Effect.fail(
      new InvalidWorkspaceMemberDataError({
        cause:
          'The member suspension returned no matching suspended membership projection.',
      })
    );
  }

  return Effect.void;
};
