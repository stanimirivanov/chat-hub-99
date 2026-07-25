import type { PublicSchema } from './database.types';

/**
 * Names of generated public PostgreSQL functions.
 */
export type DatabaseFunctionName =
  keyof PublicSchema['Functions'];

/**
 * Arguments accepted by a generated PostgreSQL function.
 */
export type DatabaseFunctionArgs<
  TName extends DatabaseFunctionName,
> = PublicSchema['Functions'][TName]['Args'];

/**
 * Value returned by a generated PostgreSQL function.
 */
export type DatabaseFunctionReturns<
  TName extends DatabaseFunctionName,
> = PublicSchema['Functions'][TName]['Returns'];

/**
 * Profile commands.
 */
export type UpdateMyProfileArgs =
  DatabaseFunctionArgs<'update_my_profile'>;

export type UpdateMyProfileResult =
  DatabaseFunctionReturns<'update_my_profile'>;

/**
 * Workspace commands.
 */
export type CreateWorkspaceArgs =
  DatabaseFunctionArgs<'create_workspace'>;

export type CreateWorkspaceResult =
  DatabaseFunctionReturns<'create_workspace'>;

export type UpdateWorkspaceArgs =
  DatabaseFunctionArgs<'update_workspace'>;

export type UpdateWorkspaceResult =
  DatabaseFunctionReturns<'update_workspace'>;

export type ArchiveWorkspaceArgs =
  DatabaseFunctionArgs<'archive_workspace'>;

export type ArchiveWorkspaceResult =
  DatabaseFunctionReturns<'archive_workspace'>;

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

/**
 * Channel commands.
 */
export type CreateChannelArgs =
  DatabaseFunctionArgs<'create_channel'>;

export type CreateChannelResult =
  DatabaseFunctionReturns<'create_channel'>;

export type UpdateChannelArgs =
  DatabaseFunctionArgs<'update_channel'>;

export type UpdateChannelResult =
  DatabaseFunctionReturns<'update_channel'>;

export type ArchiveChannelArgs =
  DatabaseFunctionArgs<'archive_channel'>;

export type ArchiveChannelResult =
  DatabaseFunctionReturns<'archive_channel'>;

/**
 * Message commands.
 */
export type CreateMessageArgs =
  DatabaseFunctionArgs<'create_message'>;

export type CreateMessageResult =
  DatabaseFunctionReturns<'create_message'>;

export type EditMessageArgs =
  DatabaseFunctionArgs<'edit_message'>;

export type EditMessageResult =
  DatabaseFunctionReturns<'edit_message'>;

export type DeleteMessageArgs =
  DatabaseFunctionArgs<'delete_message'>;

export type DeleteMessageResult =
  DatabaseFunctionReturns<'delete_message'>;