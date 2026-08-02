import { Effect } from 'effect';
import {
  InvalidWorkspaceInvitationDataError,
  type WorkspaceInvitationDeclineRepositoryError,
} from '@chat-hub/application/workspace';
import type { WorkspaceInvitationId } from '@chat-hub/domain/workspace';
import type { DeclineWorkspaceInvitationResult } from '@chat-hub/shared/database';
import {
  mapWorkspaceInvitationDeclineError,
  mapWorkspaceRepositoryError,
} from '../errors';
import { toDeclineWorkspaceInvitationArgs } from '../mapping';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';

/** Declines an invitation and validates its resulting lifecycle state. */
export const declineWorkspaceInvitation = (
  client: SupabaseWorkspaceClient,
  invitationId: WorkspaceInvitationId
): Effect.Effect<void, WorkspaceInvitationDeclineRepositoryError> =>
  Effect.tryPromise({
    try: () =>
      client.rpc(
        'decline_workspace_invitation',
        toDeclineWorkspaceInvitationArgs(invitationId)
      ),
    catch: mapWorkspaceRepositoryError,
  }).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error !== null) {
        return Effect.fail(
          mapWorkspaceInvitationDeclineError(invitationId, error)
        );
      }

      return validateDeclineResult(data, invitationId);
    })
  );

const validateDeclineResult = (
  result: DeclineWorkspaceInvitationResult | null,
  invitationId: WorkspaceInvitationId
): Effect.Effect<void, InvalidWorkspaceInvitationDataError> => {
  if (
    result === null ||
    result.workspace_invitation_id !== invitationId ||
    result.invitation_status !== 'declined'
  ) {
    return Effect.fail(
      new InvalidWorkspaceInvitationDataError({
        cause: 'Invitation decline returned no matching declined projection.',
      })
    );
  }

  return Effect.void;
};
