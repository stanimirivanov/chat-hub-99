import { Schema } from 'effect';

/**
 * Stable identity of one immutable workspace-invitation history.
 */
export const WorkspaceInvitationIdSchema = Schema.UUID.pipe(
  Schema.brand('WorkspaceInvitationId')
);

export type WorkspaceInvitationId = typeof WorkspaceInvitationIdSchema.Type;
