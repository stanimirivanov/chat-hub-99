import { Effect, Schema } from 'effect';
import {
  InvalidWorkspaceInvitationDataError,
  type PendingWorkspaceInvitation,
} from '@chat-hub/application/workspace';
import {
  WorkspaceInvitationSchema,
  type WorkspaceInvitation,
} from '@chat-hub/domain/workspace';
import { mapCurrentWorkspace } from './map-current-workspace';

const decodeInvitation = Schema.decodeUnknown(WorkspaceInvitationSchema);

export interface WorkspaceInvitationProjectionRow {
  readonly workspace_invitation_id: string | null;
  readonly workspace_id: string | null;
  readonly invited_user_id: string | null;
  readonly invitation_status: string | null;
}

export interface PendingWorkspaceInvitationRow
  extends WorkspaceInvitationProjectionRow {
  readonly workspace_name: string | null;
  readonly workspace_slug: string | null;
  readonly workspace_description: string | null;
}

/** Decodes one provider invitation projection into the domain contract. */
export const mapWorkspaceInvitation = (
  row: WorkspaceInvitationProjectionRow
): Effect.Effect<WorkspaceInvitation, InvalidWorkspaceInvitationDataError> =>
  decodeInvitation({
    id: row.workspace_invitation_id,
    workspaceId: row.workspace_id,
    invitedProfileId: row.invited_user_id,
    status: row.invitation_status,
  }).pipe(
    Effect.mapError(
      (cause) => new InvalidWorkspaceInvitationDataError({ cause })
    )
  );

/** Validates invitation and workspace data before crossing the adapter. */
export const mapPendingWorkspaceInvitation = (
  row: PendingWorkspaceInvitationRow
): Effect.Effect<
  PendingWorkspaceInvitation,
  InvalidWorkspaceInvitationDataError
> =>
  Effect.all({
    invitation: mapWorkspaceInvitation(row),
    workspace: mapCurrentWorkspace({
      workspace_id: row.workspace_id,
      name: row.workspace_name,
      slug: row.workspace_slug,
      description: row.workspace_description,
    }).pipe(
      Effect.mapError(
        (cause) => new InvalidWorkspaceInvitationDataError({ cause })
      )
    ),
  });
