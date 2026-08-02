import { Effect } from 'effect';
import {
  InvalidWorkspaceInvitationDataError,
  type InviteWorkspaceMemberCommand,
  type WorkspaceInvitationCreationRepositoryError,
} from '@chat-hub/application/workspace';
import type { WorkspaceInvitation } from '@chat-hub/domain/workspace';
import type { InviteWorkspaceMemberResult } from '@chat-hub/shared/database';
import {
  mapWorkspaceInvitationCreationError,
  mapWorkspaceRepositoryError,
} from '../errors';
import {
  mapWorkspaceInvitation,
  toInviteWorkspaceMemberArgs,
} from '../mapping';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';

/** Creates and validates one pending invitation without granting membership. */
export const inviteWorkspaceMember = (
  client: SupabaseWorkspaceClient,
  command: InviteWorkspaceMemberCommand
): Effect.Effect<
  WorkspaceInvitation,
  WorkspaceInvitationCreationRepositoryError
> =>
  Effect.tryPromise({
    try: () =>
      client.rpc(
        'invite_workspace_member',
        toInviteWorkspaceMemberArgs(command)
      ),
    catch: mapWorkspaceRepositoryError,
  }).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error !== null) {
        return Effect.fail(mapWorkspaceInvitationCreationError(command, error));
      }

      return mapInvitationResult(data, command);
    })
  );

const mapInvitationResult = (
  result: InviteWorkspaceMemberResult | null,
  command: InviteWorkspaceMemberCommand
): Effect.Effect<WorkspaceInvitation, InvalidWorkspaceInvitationDataError> => {
  if (
    result === null ||
    result.invitation_status !== 'pending' ||
    result.workspace_id !== command.workspaceId ||
    result.invited_user_id !== command.profileId
  ) {
    return Effect.fail(
      new InvalidWorkspaceInvitationDataError({
        cause: 'Invitation creation returned no matching pending projection.',
      })
    );
  }

  return mapWorkspaceInvitation(result);
};
