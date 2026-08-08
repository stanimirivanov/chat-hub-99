import { Effect } from 'effect';
import {
  InvalidWorkspaceInvitationDataError,
  type WorkspaceInvitationCancellationRepositoryError,
} from '@omoikane/application/workspace';
import type { WorkspaceInvitationId } from '@omoikane/domain/workspace';
import type { CancelWorkspaceInvitationResult } from '@omoikane/shared/database';
import {
  mapWorkspaceInvitationCancellationError,
  mapWorkspaceRepositoryError,
} from '../errors';
import { toCancelWorkspaceInvitationArgs } from '../mapping';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';

/** Cancels an invitation and validates its returned terminal projection. */
export const cancelWorkspaceInvitation = (
  client: SupabaseWorkspaceClient,
  invitationId: WorkspaceInvitationId
): Effect.Effect<void, WorkspaceInvitationCancellationRepositoryError> =>
  Effect.tryPromise({
    try: () =>
      client.rpc(
        'cancel_workspace_invitation',
        toCancelWorkspaceInvitationArgs(invitationId)
      ),
    catch: mapWorkspaceRepositoryError,
  }).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error !== null) {
        return Effect.fail(
          mapWorkspaceInvitationCancellationError(invitationId, error)
        );
      }

      return validateCancellationResult(data, invitationId);
    })
  );

const validateCancellationResult = (
  result: CancelWorkspaceInvitationResult | null,
  invitationId: WorkspaceInvitationId
): Effect.Effect<void, InvalidWorkspaceInvitationDataError> => {
  if (
    result === null ||
    result.workspace_invitation_id !== invitationId ||
    result.invitation_status !== 'cancelled'
  ) {
    return Effect.fail(
      new InvalidWorkspaceInvitationDataError({
        cause:
          'Invitation cancellation returned no matching cancelled projection.',
      })
    );
  }

  return Effect.void;
};
