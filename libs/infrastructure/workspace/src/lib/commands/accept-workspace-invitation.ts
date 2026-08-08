import { Effect } from 'effect';
import {
  InvalidWorkspaceMemberDataError,
  type WorkspaceInvitationAcceptanceRepositoryError,
} from '@omoikane/application/workspace';
import type {
  WorkspaceInvitationId,
  WorkspaceMember,
} from '@omoikane/domain/workspace';
import type { AcceptWorkspaceInvitationResult } from '@omoikane/shared/database';
import {
  mapWorkspaceInvitationAcceptanceError,
  mapWorkspaceRepositoryError,
} from '../errors';
import {
  mapCurrentWorkspaceMember,
  toAcceptWorkspaceInvitationArgs,
} from '../mapping';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';

/** Accepts an invitation and validates its resulting active membership. */
export const acceptWorkspaceInvitation = (
  client: SupabaseWorkspaceClient,
  invitationId: WorkspaceInvitationId
): Effect.Effect<
  WorkspaceMember,
  WorkspaceInvitationAcceptanceRepositoryError
> =>
  Effect.tryPromise({
    try: () =>
      client.rpc(
        'accept_workspace_invitation',
        toAcceptWorkspaceInvitationArgs(invitationId)
      ),
    catch: mapWorkspaceRepositoryError,
  }).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error !== null) {
        return Effect.fail(
          mapWorkspaceInvitationAcceptanceError(invitationId, error)
        );
      }

      return mapAcceptanceResult(data);
    })
  );

const mapAcceptanceResult = (
  result: AcceptWorkspaceInvitationResult | null
): Effect.Effect<WorkspaceMember, InvalidWorkspaceMemberDataError> => {
  if (
    result === null ||
    result.membership_status !== 'active' ||
    result.membership_role !== 'member'
  ) {
    return Effect.fail(
      new InvalidWorkspaceMemberDataError({
        cause:
          'Invitation acceptance returned no active default-member projection.',
      })
    );
  }

  return mapCurrentWorkspaceMember(result);
};
