import type {
  ChangeWorkspaceMemberRoleCommand,
  CreateWorkspaceCommand,
} from '@chat-hub/application/workspace';
import type {
  ChangeWorkspaceMemberRoleArgs,
  CreateWorkspaceArgs,
} from '@chat-hub/shared/database';

/**
 * Maps a validated creation command to generated Supabase RPC arguments.
 */
export const toCreateWorkspaceArgs = (
  command: CreateWorkspaceCommand
): CreateWorkspaceArgs => ({
  p_name: command.name,
  p_slug: command.slug,
  ...(command.description === null
    ? {}
    : { p_description: command.description }),
});

/**
 * Maps a validated role-change command to generated Supabase RPC arguments.
 */
export const toChangeWorkspaceMemberRoleArgs = (
  command: ChangeWorkspaceMemberRoleCommand
): ChangeWorkspaceMemberRoleArgs => ({
  p_workspace_id: command.workspaceId,
  p_user_id: command.profileId,
  p_role: command.role,
});
