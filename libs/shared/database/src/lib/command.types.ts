import type { PublicSchema } from './database.types';

/**
 * Names of generated public PostgreSQL functions.
 */
export type DatabaseFunctionName = keyof PublicSchema['Functions'];

/**
 * Arguments accepted by a generated PostgreSQL function.
 */
export type DatabaseFunctionArgs<TName extends DatabaseFunctionName> =
  PublicSchema['Functions'][TName]['Args'];

/**
 * Value returned by a generated PostgreSQL function.
 */
export type DatabaseFunctionReturns<TName extends DatabaseFunctionName> =
  PublicSchema['Functions'][TName]['Returns'];

/**
 * Profile commands.
 */
export type UpdateMyProfileArgs = DatabaseFunctionArgs<'update_my_profile'>;

export type UpdateMyProfileResult =
  DatabaseFunctionReturns<'update_my_profile'>;

/**
 * Workspace commands.
 */
export type CreateWorkspaceArgs = DatabaseFunctionArgs<'create_workspace'>;

export type CreateWorkspaceResult = DatabaseFunctionReturns<'create_workspace'>;

export type UpdateWorkspaceArgs = DatabaseFunctionArgs<'update_workspace'>;

export type UpdateWorkspaceResult = DatabaseFunctionReturns<'update_workspace'>;

export type ArchiveWorkspaceArgs = DatabaseFunctionArgs<'archive_workspace'>;

export type ArchiveWorkspaceResult =
  DatabaseFunctionReturns<'archive_workspace'>;

export type RestoreWorkspaceArgs = DatabaseFunctionArgs<'restore_workspace'>;

export type RestoreWorkspaceResult =
  DatabaseFunctionReturns<'restore_workspace'>;

/**
 * Workspace-membership commands.
 */
export type AddWorkspaceMemberArgs =
  DatabaseFunctionArgs<'add_workspace_member'>;

export type AddWorkspaceMemberResult =
  DatabaseFunctionReturns<'add_workspace_member'>;

export type ChangeWorkspaceMemberRoleArgs =
  DatabaseFunctionArgs<'change_workspace_member_role'>;

export type ChangeWorkspaceMemberRoleResult =
  DatabaseFunctionReturns<'change_workspace_member_role'>;

export type RemoveWorkspaceMemberArgs =
  DatabaseFunctionArgs<'remove_workspace_member'>;

export type RemoveWorkspaceMemberResult =
  DatabaseFunctionReturns<'remove_workspace_member'>;

export type SuspendWorkspaceMemberArgs =
  DatabaseFunctionArgs<'suspend_workspace_member'>;

export type SuspendWorkspaceMemberResult =
  DatabaseFunctionReturns<'suspend_workspace_member'>;

export type LeaveWorkspaceArgs = DatabaseFunctionArgs<'leave_workspace'>;

export type LeaveWorkspaceResult = DatabaseFunctionReturns<'leave_workspace'>;

/**
 * Workspace-invitation commands and recipient query.
 */
export type InviteWorkspaceMemberArgs =
  DatabaseFunctionArgs<'invite_workspace_member'>;

export type InviteWorkspaceMemberResult =
  DatabaseFunctionReturns<'invite_workspace_member'>;

export type AcceptWorkspaceInvitationArgs =
  DatabaseFunctionArgs<'accept_workspace_invitation'>;

export type AcceptWorkspaceInvitationResult =
  DatabaseFunctionReturns<'accept_workspace_invitation'>;

export type DeclineWorkspaceInvitationArgs =
  DatabaseFunctionArgs<'decline_workspace_invitation'>;

export type DeclineWorkspaceInvitationResult =
  DatabaseFunctionReturns<'decline_workspace_invitation'>;

export type ListPendingWorkspaceInvitationsResult =
  DatabaseFunctionReturns<'list_pending_workspace_invitations'>;

export type ListPendingWorkspaceInvitationsForWorkspaceArgs =
  DatabaseFunctionArgs<'list_pending_workspace_invitations_for_workspace'>;

export type ListPendingWorkspaceInvitationsForWorkspaceResult =
  DatabaseFunctionReturns<'list_pending_workspace_invitations_for_workspace'>;

export type CancelWorkspaceInvitationArgs =
  DatabaseFunctionArgs<'cancel_workspace_invitation'>;

export type CancelWorkspaceInvitationResult =
  DatabaseFunctionReturns<'cancel_workspace_invitation'>;

/**
 * Channel commands.
 */
export type CreateChannelArgs = DatabaseFunctionArgs<'create_channel'>;

export type CreateChannelResult = DatabaseFunctionReturns<'create_channel'>;

export type UpdateChannelArgs = DatabaseFunctionArgs<'update_channel'>;

export type UpdateChannelResult = DatabaseFunctionReturns<'update_channel'>;

export type ArchiveChannelArgs = DatabaseFunctionArgs<'archive_channel'>;

export type ArchiveChannelResult = DatabaseFunctionReturns<'archive_channel'>;

export type RestoreChannelArgs = DatabaseFunctionArgs<'restore_channel'>;

export type RestoreChannelResult = DatabaseFunctionReturns<'restore_channel'>;

/**
 * Message commands.
 */
export type CreateMessageArgs = DatabaseFunctionArgs<'create_message'>;

export type CreateMessageResult = DatabaseFunctionReturns<'create_message'>;

export type EditMessageArgs = DatabaseFunctionArgs<'edit_message'>;

export type EditMessageResult = DatabaseFunctionReturns<'edit_message'>;

export type DeleteMessageArgs = DatabaseFunctionArgs<'delete_message'>;

export type DeleteMessageResult = DatabaseFunctionReturns<'delete_message'>;

/** Workspace-scoped current-message search. */
export type SearchWorkspaceMessagesArgs =
  DatabaseFunctionArgs<'search_workspace_messages'>;

type GeneratedSearchWorkspaceMessagesResult =
  DatabaseFunctionReturns<'search_workspace_messages'>;

type GeneratedSearchWorkspaceMessagesRow =
  GeneratedSearchWorkspaceMessagesResult[number];

/**
 * Search rows returned by PostgreSQL at runtime.
 *
 * PostgreSQL's `RETURNS TABLE` declaration does not expose output-column
 * nullability to the Supabase type generator. The generated RPC contract
 * therefore marks these two nullable message columns as required strings.
 * Keep the generated file untouched and correct that known boundary here.
 */
export type SearchWorkspaceMessagesResult = Array<
  Omit<GeneratedSearchWorkspaceMessagesRow, 'deleted_at' | 'deleted_by'> & {
    deleted_at: string | null;
    deleted_by: string | null;
  }
>;
