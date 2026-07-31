import { Effect } from 'effect';
import {
  InvalidWorkspaceMemberDataError,
  type ChangeWorkspaceMemberRoleCommand,
  type WorkspaceMemberRoleChangeRepositoryError,
} from '@chat-hub/application/workspace';
import type { WorkspaceMember } from '@chat-hub/domain/workspace';
import type { ChangeWorkspaceMemberRoleResult } from '@chat-hub/shared/database';
import {
  mapWorkspaceMemberRoleChangeError,
  mapWorkspaceRepositoryError,
} from '../errors';
import {
  mapCurrentWorkspaceMember,
  toChangeWorkspaceMemberRoleArgs,
} from '../mapping';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';

/**
 * Executes the transactional role-change RPC and validates the returned
 * canonical active-membership projection.
 */
export const changeWorkspaceMemberRole = (
  client: SupabaseWorkspaceClient,
  command: ChangeWorkspaceMemberRoleCommand
): Effect.Effect<WorkspaceMember, WorkspaceMemberRoleChangeRepositoryError> =>
  Effect.tryPromise({
    try: () =>
      client.rpc(
        'change_workspace_member_role',
        toChangeWorkspaceMemberRoleArgs(command)
      ),
    catch: mapWorkspaceRepositoryError,
  }).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error !== null) {
        return Effect.fail(mapWorkspaceMemberRoleChangeError(command, error));
      }

      return mapRoleChangeResult(data, command);
    })
  );

const mapRoleChangeResult = (
  result: ChangeWorkspaceMemberRoleResult | null,
  command: ChangeWorkspaceMemberRoleCommand
): Effect.Effect<WorkspaceMember, InvalidWorkspaceMemberDataError> => {
  if (
    result === null ||
    result.membership_status !== 'active' ||
    result.workspace_id !== command.workspaceId ||
    result.user_id !== command.profileId
  ) {
    return Effect.fail(
      new InvalidWorkspaceMemberDataError({
        cause:
          'The role change returned no matching active membership projection.',
      })
    );
  }

  return mapCurrentWorkspaceMember(result);
};
