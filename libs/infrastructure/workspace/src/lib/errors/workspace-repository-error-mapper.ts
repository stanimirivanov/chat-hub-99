import {
  WorkspaceLastOwnerDemotionError,
  WorkspaceMemberNotActiveError,
  WorkspaceMemberNotFoundError,
  WorkspaceMemberRoleChangeNotAllowedError,
  WorkspaceMemberRoleUnchangedError,
  WorkspaceRepositoryUnavailableError,
  WorkspaceSlugUnavailableError,
  type ChangeWorkspaceMemberRoleCommand,
  type CreateWorkspaceCommand,
  type WorkspaceMemberRoleChangeRepositoryError,
  type WorkspaceRepositoryCreateError,
} from '@chat-hub/application/workspace';

interface PostgrestErrorLike {
  readonly code: string;
  readonly message: string;
  readonly details?: string;
}

const WORKSPACE_SLUG_UNIQUE_CONSTRAINT = 'workspace_heads_current_slug_unique';

export const mapWorkspaceRepositoryError = (
  cause: unknown
): WorkspaceRepositoryUnavailableError =>
  new WorkspaceRepositoryUnavailableError({ cause });

/**
 * Preserves the actionable current-slug conflict while translating every
 * other provider failure to the stable repository-unavailable vocabulary.
 */
export const mapWorkspaceCreateError = (
  command: CreateWorkspaceCommand,
  error: PostgrestErrorLike
): WorkspaceRepositoryCreateError => {
  const description = `${error.message} ${error.details ?? ''}`;

  if (
    error.code === '23505' &&
    description.includes(WORKSPACE_SLUG_UNIQUE_CONSTRAINT)
  ) {
    return new WorkspaceSlugUnavailableError({
      slug: command.slug,
    });
  }

  return mapWorkspaceRepositoryError(error);
};

/**
 * Translates the stable SQL-state/message contract of the membership RPC into
 * provider-independent failures that the application and UI can act on.
 */
export const mapWorkspaceMemberRoleChangeError = (
  command: ChangeWorkspaceMemberRoleCommand,
  error: PostgrestErrorLike
): WorkspaceMemberRoleChangeRepositoryError => {
  const message = error.message.toLowerCase();

  if (
    error.code === '28000' ||
    error.code === '42501' ||
    (error.code === 'P0002' && message.startsWith('workspace ')) ||
    (error.code === '55000' &&
      message.includes('workspace') &&
      message.includes('not active'))
  ) {
    return new WorkspaceMemberRoleChangeNotAllowedError({
      workspaceId: command.workspaceId,
    });
  }

  if (error.code === 'P0002' && message.includes('is not a member')) {
    return new WorkspaceMemberNotFoundError({
      workspaceId: command.workspaceId,
      profileId: command.profileId,
    });
  }

  if (
    error.code === '55000' &&
    message.includes('active workspace memberships')
  ) {
    return new WorkspaceMemberNotActiveError({
      workspaceId: command.workspaceId,
      profileId: command.profileId,
    });
  }

  if (error.code === '55000' && message.includes('already has role')) {
    return new WorkspaceMemberRoleUnchangedError({
      workspaceId: command.workspaceId,
      profileId: command.profileId,
      role: command.role,
    });
  }

  if (
    error.code === '55000' &&
    message.includes('last active workspace owner')
  ) {
    return new WorkspaceLastOwnerDemotionError({
      workspaceId: command.workspaceId,
      profileId: command.profileId,
    });
  }

  return mapWorkspaceRepositoryError(error);
};
