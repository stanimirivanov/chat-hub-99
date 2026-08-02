import type {
  AddWorkspaceMemberCommand,
  ChangeWorkspaceMemberRoleCommand,
  CreateWorkspaceCommand,
  RemoveWorkspaceMemberCommand,
  UpdateWorkspaceCommand,
} from '@chat-hub/application/workspace';
import type { WorkspaceId } from '@chat-hub/domain/workspace';
import type {
  AddWorkspaceMemberArgs,
  ArchiveWorkspaceArgs,
  ChangeWorkspaceMemberRoleArgs,
  CreateWorkspaceArgs,
  LeaveWorkspaceArgs,
  RemoveWorkspaceMemberArgs,
  UpdateWorkspaceArgs,
} from '@chat-hub/shared/database';

/**
 * Maps a validated workspace identity to generated archive RPC arguments.
 */
export const toArchiveWorkspaceArgs = (
  workspaceId: WorkspaceId
): ArchiveWorkspaceArgs => ({
  p_workspace_id: workspaceId,
});

/**
 * Maps a validated workspace identity to generated self-departure arguments.
 */
export const toLeaveWorkspaceArgs = (
  workspaceId: WorkspaceId
): LeaveWorkspaceArgs => ({
  p_workspace_id: workspaceId,
});

/**
 * Maps a validated addition command to generated Supabase RPC arguments.
 */
export const toAddWorkspaceMemberArgs = (
  command: AddWorkspaceMemberCommand
): AddWorkspaceMemberArgs => ({
  p_workspace_id: command.workspaceId,
  p_user_id: command.profileId,
});

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
 * Maps a validated update command to generated Supabase RPC arguments.
 */
export const toUpdateWorkspaceArgs = (
  command: UpdateWorkspaceCommand
): UpdateWorkspaceArgs => ({
  p_workspace_id: command.workspaceId,
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
