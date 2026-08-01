import type {
  ChangeWorkspaceMemberRoleCommand,
  CreateWorkspaceCommand,
  RemoveWorkspaceMemberCommand,
} from '@chat-hub/application/workspace';
import type {
  ChangeWorkspaceMemberRoleArgs,
  CreateWorkspaceArgs,
  RemoveWorkspaceMemberArgs,
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

/**
 * Maps a validated removal command to generated Supabase RPC arguments.
 */
export const toRemoveWorkspaceMemberArgs = (
  command: RemoveWorkspaceMemberCommand
): RemoveWorkspaceMemberArgs => ({
  p_workspace_id: command.workspaceId,
  p_user_id: command.profileId,
  ...(command.reason === null ? {} : { p_reason: command.reason }),
});
