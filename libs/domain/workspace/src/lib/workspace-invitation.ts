import { Schema } from 'effect';
import { ProfileIdSchema } from '@chat-hub/domain/profile';
import { WorkspaceIdSchema } from './workspace-id';
import { WorkspaceInvitationIdSchema } from './workspace-invitation-id';

/**
 * Closed lifecycle vocabulary selected by the current invitation head.
 */
export const WorkspaceInvitationStatusSchema = Schema.Literal(
  'pending',
  'accepted',
  'declined',
  'cancelled'
);

export type WorkspaceInvitationStatus =
  typeof WorkspaceInvitationStatusSchema.Type;

/**
 * Current projection of one consent-based workspace invitation.
 *
 * Workspace presentation is intentionally separate: the invitation owns
 * stable identities and lifecycle state, while workspace names and slugs may
 * continue changing independently.
 */
export const WorkspaceInvitationSchema = Schema.Struct({
  id: WorkspaceInvitationIdSchema,
  workspaceId: WorkspaceIdSchema,
  invitedProfileId: ProfileIdSchema,
  status: WorkspaceInvitationStatusSchema,
});

export type WorkspaceInvitation = typeof WorkspaceInvitationSchema.Type;
