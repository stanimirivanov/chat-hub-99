import { Effect } from 'effect';
import {
  InvalidWorkspaceMemberDataError,
  type RemoveWorkspaceMemberCommand,
  type WorkspaceMemberRemovalRepositoryError,
} from '@chat-hub/application/workspace';
import type { RemoveWorkspaceMemberResult } from '@chat-hub/shared/database';
import {
  mapWorkspaceMemberRemovalError,
  mapWorkspaceRepositoryError,
} from '../errors';
import { toRemoveWorkspaceMemberArgs } from '../mapping';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';

/**
 * Executes the transactional removal RPC and validates that its canonical
 * result identifies the requested membership in the removed state.
 */
export const removeWorkspaceMember = (
  client: SupabaseWorkspaceClient,
  command: RemoveWorkspaceMemberCommand
): Effect.Effect<void, WorkspaceMemberRemovalRepositoryError> =>
  Effect.tryPromise({
    try: () =>
      client.rpc(
        'remove_workspace_member',
        toRemoveWorkspaceMemberArgs(command)
      ),
    catch: mapWorkspaceRepositoryError,
  }).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error !== null) {
        return Effect.fail(mapWorkspaceMemberRemovalError(command, error));
      }

      return validateRemovalResult(data, command);
    })
  );

const validateRemovalResult = (
  result: RemoveWorkspaceMemberResult | null,
  command: RemoveWorkspaceMemberCommand
): Effect.Effect<void, InvalidWorkspaceMemberDataError> => {
  if (
    result === null ||
    result.membership_status !== 'removed' ||
    result.workspace_id !== command.workspaceId ||
    result.user_id !== command.profileId
  ) {
    return Effect.fail(
      new InvalidWorkspaceMemberDataError({
        cause:
          'The member removal returned no matching removed membership projection.',
      })
    );
  }

  return Effect.void;
};
