import { Effect } from 'effect';
import {
  InvalidWorkspaceMemberDataError,
  type AddWorkspaceMemberCommand,
  type WorkspaceMemberAddRepositoryError,
} from '@omoikane/application/workspace';
import type { WorkspaceMember } from '@omoikane/domain/workspace';
import type { AddWorkspaceMemberResult } from '@omoikane/shared/database';
import {
  mapWorkspaceMemberAdditionError,
  mapWorkspaceRepositoryError,
} from '../errors';
import {
  mapCurrentWorkspaceMember,
  toAddWorkspaceMemberArgs,
} from '../mapping';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';

/**
 * Executes the transactional add-or-reactivate RPC and validates its canonical
 * active default-member projection before it crosses the adapter boundary.
 */
export const addWorkspaceMember = (
  client: SupabaseWorkspaceClient,
  command: AddWorkspaceMemberCommand
): Effect.Effect<WorkspaceMember, WorkspaceMemberAddRepositoryError> =>
  Effect.tryPromise({
    try: () =>
      client.rpc('add_workspace_member', toAddWorkspaceMemberArgs(command)),
    catch: mapWorkspaceRepositoryError,
  }).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error !== null) {
        return Effect.fail(mapWorkspaceMemberAdditionError(command, error));
      }

      return mapAdditionResult(data, command);
    })
  );

const mapAdditionResult = (
  result: AddWorkspaceMemberResult | null,
  command: AddWorkspaceMemberCommand
): Effect.Effect<WorkspaceMember, InvalidWorkspaceMemberDataError> => {
  if (
    result === null ||
    result.membership_status !== 'active' ||
    result.membership_role !== 'member' ||
    result.workspace_id !== command.workspaceId ||
    result.user_id !== command.profileId
  ) {
    return Effect.fail(
      new InvalidWorkspaceMemberDataError({
        cause:
          'Member addition or reactivation returned no matching active default-member projection.',
      })
    );
  }

  return mapCurrentWorkspaceMember(result);
};
