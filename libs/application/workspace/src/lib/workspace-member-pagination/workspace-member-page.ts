import { Schema } from 'effect';
import { ProfileIdSchema } from '@omoikane/domain/profile';
import {
  WorkspaceMemberRoleSchema,
  type WorkspaceMember,
} from '@omoikane/domain/workspace';

/** Fixed page size for the workspace-specific member directory. */
export const WORKSPACE_MEMBER_PAGE_SIZE = 25 as const;
export type WorkspaceMemberPageSize = typeof WORKSPACE_MEMBER_PAGE_SIZE;

/** Stable cursor matching owner-first, profile-identity database ordering. */
export const WorkspaceMemberCursorSchema = Schema.Struct({
  role: WorkspaceMemberRoleSchema,
  profileId: ProfileIdSchema,
});

export type WorkspaceMemberCursor = typeof WorkspaceMemberCursorSchema.Type;

/** One active-member page and the cursor for the following page. */
export interface WorkspaceMemberPage {
  readonly members: readonly WorkspaceMember[];
  readonly nextCursor: WorkspaceMemberCursor | null;
}
