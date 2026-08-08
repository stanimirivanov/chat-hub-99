import { Schema } from 'effect';
import { ProfileIdSchema } from '@omoikane/domain/profile';
import { WorkspaceIdSchema } from './workspace-id';

/**
 * Active workspace role exposed by the membership directory.
 */
export const WorkspaceMemberRoleSchema = Schema.Literal('owner', 'member');

export type WorkspaceMemberRole = typeof WorkspaceMemberRoleSchema.Type;

/**
 * Active membership projection required by workspace presentation.
 *
 * Membership lifecycle history and authorization policy remain database
 * concerns. The profile identity is stable and can be enriched independently.
 */
export const WorkspaceMemberSchema = Schema.Struct({
  workspaceId: WorkspaceIdSchema,
  profileId: ProfileIdSchema,
  role: WorkspaceMemberRoleSchema,
});

export type WorkspaceMember = typeof WorkspaceMemberSchema.Type;
