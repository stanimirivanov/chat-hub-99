import {
  WorkspaceMemberAdditionNotAllowedError,
  WorkspaceMemberProfileNotActiveError,
  WorkspaceMembershipHistoryExistsError,
  WorkspaceLastOwnerDemotionError,
  WorkspaceLastOwnerRemovalError,
  WorkspaceMemberNotActiveError,
  WorkspaceMemberNotFoundError,
  WorkspaceMemberRemovalNotAllowedError,
  WorkspaceMemberRoleChangeNotAllowedError,
  WorkspaceMemberRoleUnchangedError,
  WorkspaceRepositoryUnavailableError,
  WorkspaceSlugUnavailableError,
  WorkspaceUpdateNotAllowedError,
  type ChangeWorkspaceMemberRoleCommand,
  type CreateWorkspaceCommand,
  type AddWorkspaceMemberCommand,
  type WorkspaceMemberAddRepositoryError,
  type RemoveWorkspaceMemberCommand,
  type WorkspaceMemberRemovalRepositoryError,
  type WorkspaceMemberRoleChangeRepositoryError,
  type WorkspaceRepositoryCreateError,
  type UpdateWorkspaceCommand,
  type WorkspaceRepositoryUpdateError,
} from '@chat-hub/application/workspace';

interface PostgrestErrorLike {
  readonly code: string;
  readonly message: string;
  readonly details?: string;
}

const WORKSPACE_SLUG_UNIQUE_CONSTRAINT = 'workspace_heads_current_slug_unique';

const isWorkspaceSlugConflict = (error: PostgrestErrorLike): boolean => {
  const description = `${error.message} ${error.details ?? ''}`;

  return (
    error.code === '23505' &&
    description.includes(WORKSPACE_SLUG_UNIQUE_CONSTRAINT)
  );
};

const isWorkspaceCommandNotAllowed = (
  error: PostgrestErrorLike,
  normalizedMessage: string
): boolean =>
  error.code === '28000' ||
  error.code === '42501' ||
  (error.code === 'P0002' && normalizedMessage.startsWith('workspace ')) ||
  (error.code === '55000' &&
    normalizedMessage.includes('workspace') &&
    normalizedMessage.includes('not active'));

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
  if (isWorkspaceSlugConflict(error)) {
    return new WorkspaceSlugUnavailableError({
      slug: command.slug,
    });
  }

  return mapWorkspaceRepositoryError(error);
};

/**
 * Preserves actionable update outcomes from the stable RPC error contract.
 */
export const mapWorkspaceUpdateError = (
  command: UpdateWorkspaceCommand,
  error: PostgrestErrorLike
): WorkspaceRepositoryUpdateError => {
  if (isWorkspaceSlugConflict(error)) {
    return new WorkspaceSlugUnavailableError({ slug: command.slug });
  }

  const message = error.message.toLowerCase();

  if (
    error.code === '28000' ||
    error.code === '42501' ||
    (error.code === 'P0002' && message.includes('workspace not found')) ||
    (error.code === '55000' &&
      message.includes('archived workspaces cannot be updated'))
  ) {
    return new WorkspaceUpdateNotAllowedError({
      workspaceId: command.workspaceId,
    });
  }

  return mapWorkspaceRepositoryError(error);
};

/**
 * Translates the stable SQL-state/message contract of the add-member RPC.
 */
export const mapWorkspaceMemberAdditionError = (
  command: AddWorkspaceMemberCommand,
  error: PostgrestErrorLike
): WorkspaceMemberAddRepositoryError => {
  const message = error.message.toLowerCase();

  if (isWorkspaceCommandNotAllowed(error, message)) {
    return new WorkspaceMemberAdditionNotAllowedError({
      workspaceId: command.workspaceId,
    });
  }

  if (
    error.code === '55000' &&
    message.includes('does not have an active profile')
  ) {
    return new WorkspaceMemberProfileNotActiveError({
      workspaceId: command.workspaceId,
      profileId: command.profileId,
    });
  }

  if (
    error.code === '23505' &&
    message.includes('already has a membership history')
  ) {
    return new WorkspaceMembershipHistoryExistsError({
      workspaceId: command.workspaceId,
      profileId: command.profileId,
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

  if (isWorkspaceCommandNotAllowed(error, message)) {
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

/**
 * Translates the stable SQL-state/message contract of the removal RPC into
 * provider-independent failures that the application and UI can act on.
 */
export const mapWorkspaceMemberRemovalError = (
  command: RemoveWorkspaceMemberCommand,
  error: PostgrestErrorLike
): WorkspaceMemberRemovalRepositoryError => {
  const message = error.message.toLowerCase();

  if (
    isWorkspaceCommandNotAllowed(error, message) ||
    (error.code === '55000' && message.includes('cannot remove themselves'))
  ) {
    return new WorkspaceMemberRemovalNotAllowedError({
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
    message.includes('active workspace member may be removed')
  ) {
    return new WorkspaceMemberNotActiveError({
      workspaceId: command.workspaceId,
      profileId: command.profileId,
    });
  }

  if (
    error.code === '55000' &&
    message.includes('last active workspace owner')
  ) {
    return new WorkspaceLastOwnerRemovalError({
      workspaceId: command.workspaceId,
      profileId: command.profileId,
    });
  }

  return mapWorkspaceRepositoryError(error);
};
