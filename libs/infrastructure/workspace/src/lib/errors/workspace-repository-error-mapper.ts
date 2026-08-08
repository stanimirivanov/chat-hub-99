import {
  WorkspaceArchiveNotAllowedError,
  WorkspaceRestoreNotAllowedError,
  WorkspaceDepartureNotAllowedError,
  WorkspaceMemberAdditionNotAllowedError,
  WorkspaceMemberAlreadyActiveError,
  WorkspaceMemberProfileNotActiveError,
  WorkspaceMemberReactivationNotAllowedError,
  WorkspaceLastOwnerDemotionError,
  WorkspaceLastOwnerRemovalError,
  WorkspaceLastOwnerSuspensionError,
  WorkspaceLastOwnerDepartureError,
  WorkspaceMemberNotActiveError,
  WorkspaceMemberNotFoundError,
  WorkspaceMemberRemovalNotAllowedError,
  WorkspaceMemberSuspensionNotAllowedError,
  WorkspaceMemberRoleChangeNotAllowedError,
  WorkspaceMemberRoleUnchangedError,
  WorkspaceInvitationAlreadyPendingError,
  WorkspaceInvitationCancellationNotAllowedError,
  WorkspaceInvitationCreationNotAllowedError,
  WorkspaceInvitationManagementNotAllowedError,
  WorkspaceInvitationMemberAlreadyActiveError,
  WorkspaceInvitationProfileNotActiveError,
  WorkspaceInvitationResponseNotAllowedError,
  WorkspaceRepositoryUnavailableError,
  WorkspaceSlugUnavailableError,
  WorkspaceUpdateNotAllowedError,
  type ChangeWorkspaceMemberRoleCommand,
  type CreateWorkspaceCommand,
  type AddWorkspaceMemberCommand,
  type WorkspaceMemberAddRepositoryError,
  type RemoveWorkspaceMemberCommand,
  type SuspendWorkspaceMemberCommand,
  type InviteWorkspaceMemberCommand,
  type WorkspaceMemberRemovalRepositoryError,
  type WorkspaceMemberSuspensionRepositoryError,
  type WorkspaceMemberRoleChangeRepositoryError,
  type WorkspaceRepositoryArchiveError,
  type WorkspaceRepositoryRestoreError,
  type WorkspaceDepartureRepositoryError,
  type WorkspaceRepositoryCreateError,
  type UpdateWorkspaceCommand,
  type WorkspaceRepositoryUpdateError,
  type WorkspaceInvitationCreationRepositoryError,
  type WorkspaceInvitationAcceptanceRepositoryError,
  type WorkspaceInvitationCancellationRepositoryError,
  type WorkspaceInvitationDeclineRepositoryError,
  type WorkspaceInvitationOwnerRepositoryReadError,
} from '@omoikane/application/workspace';
import type {
  WorkspaceId,
  WorkspaceInvitationId,
} from '@omoikane/domain/workspace';

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
 * Translates stable archive authorization and lifecycle failures.
 */
export const mapWorkspaceArchiveError = (
  workspaceId: WorkspaceId,
  error: PostgrestErrorLike
): WorkspaceRepositoryArchiveError => {
  const message = error.message.toLowerCase();

  if (
    error.code === '28000' ||
    error.code === '42501' ||
    (error.code === 'P0002' && message.includes('workspace not found')) ||
    (error.code === '55000' && message.includes('already archived'))
  ) {
    return new WorkspaceArchiveNotAllowedError({ workspaceId });
  }

  return mapWorkspaceRepositoryError(error);
};

/** Translates stable restoration authorization and lifecycle failures. */
export const mapWorkspaceRestoreError = (
  workspaceId: WorkspaceId,
  error: PostgrestErrorLike
): WorkspaceRepositoryRestoreError => {
  const message = error.message.toLowerCase();

  if (
    error.code === '28000' ||
    error.code === '42501' ||
    (error.code === 'P0002' && message.includes('workspace not found')) ||
    (error.code === '55000' && message.includes('only archived workspaces'))
  ) {
    return new WorkspaceRestoreNotAllowedError({ workspaceId });
  }

  return mapWorkspaceRepositoryError(error);
};

/**
 * Translates stable self-departure lifecycle outcomes without exposing
 * PostgREST details beyond the infrastructure boundary.
 */
export const mapWorkspaceDepartureError = (
  workspaceId: WorkspaceId,
  error: PostgrestErrorLike
): WorkspaceDepartureRepositoryError => {
  const message = error.message.toLowerCase();

  if (
    error.code === '55000' &&
    message.includes('last active workspace owner')
  ) {
    return new WorkspaceLastOwnerDepartureError({ workspaceId });
  }

  if (
    error.code === '28000' ||
    (error.code === 'P0002' &&
      ((message.startsWith('workspace ') &&
        message.includes('does not exist')) ||
        message.startsWith(
          'authenticated user is not a member of workspace '
        ))) ||
    (error.code === '55000' &&
      ((message.startsWith('workspace ') &&
        message.includes('is not active')) ||
        message === 'only active workspace members may leave'))
  ) {
    return new WorkspaceDepartureNotAllowedError({ workspaceId });
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
    error.code === '55000' &&
    message.includes('already an active workspace member')
  ) {
    return new WorkspaceMemberAlreadyActiveError({
      workspaceId: command.workspaceId,
      profileId: command.profileId,
    });
  }

  if (
    error.code === '55000' &&
    message === 'only left, removed, or suspended memberships may be reinstated'
  ) {
    return new WorkspaceMemberReactivationNotAllowedError({
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

/**
 * Translates the stable suspension RPC contract into provider-independent
 * membership failures.
 */
export const mapWorkspaceMemberSuspensionError = (
  command: SuspendWorkspaceMemberCommand,
  error: PostgrestErrorLike
): WorkspaceMemberSuspensionRepositoryError => {
  const message = error.message.toLowerCase();

  if (
    error.code === '55000' &&
    message.includes('last active workspace owner')
  ) {
    return new WorkspaceLastOwnerSuspensionError({
      workspaceId: command.workspaceId,
      profileId: command.profileId,
    });
  }

  if (
    isWorkspaceCommandNotAllowed(error, message) ||
    (error.code === '55000' && message.includes('cannot suspend themselves'))
  ) {
    return new WorkspaceMemberSuspensionNotAllowedError({
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
    message.includes('active workspace member may be suspended')
  ) {
    return new WorkspaceMemberNotActiveError({
      workspaceId: command.workspaceId,
      profileId: command.profileId,
    });
  }

  return mapWorkspaceRepositoryError(error);
};

/** Translates stable invitation-creation outcomes into application failures. */
export const mapWorkspaceInvitationCreationError = (
  command: InviteWorkspaceMemberCommand,
  error: PostgrestErrorLike
): WorkspaceInvitationCreationRepositoryError => {
  const message = error.message.toLowerCase();

  if (isWorkspaceCommandNotAllowed(error, message)) {
    return new WorkspaceInvitationCreationNotAllowedError({
      workspaceId: command.workspaceId,
    });
  }

  if (
    error.code === '55000' &&
    message.includes('does not have an active profile')
  ) {
    return new WorkspaceInvitationProfileNotActiveError({
      workspaceId: command.workspaceId,
      profileId: command.profileId,
    });
  }

  if (
    error.code === '55000' &&
    message.includes('already an active workspace member')
  ) {
    return new WorkspaceInvitationMemberAlreadyActiveError({
      workspaceId: command.workspaceId,
      profileId: command.profileId,
    });
  }

  if (
    (error.code === '55000' &&
      message.includes('already has a pending workspace invitation')) ||
    (error.code === '23505' &&
      `${error.message} ${error.details ?? ''}`.includes(
        'workspace_invitation_heads_pending_unique'
      ))
  ) {
    return new WorkspaceInvitationAlreadyPendingError({
      workspaceId: command.workspaceId,
      profileId: command.profileId,
    });
  }

  return mapWorkspaceRepositoryError(error);
};

const isInvitationResponseNotAllowed = (error: PostgrestErrorLike): boolean => {
  const message = error.message.toLowerCase();

  return (
    error.code === '28000' ||
    error.code === '42501' ||
    (error.code === 'P0002' && message.includes('workspace invitation')) ||
    (error.code === '55000' &&
      (message.includes('pending workspace invitation') ||
        message.includes('invitation can no longer be accepted') ||
        message.includes('already an active workspace member')))
  );
};

/** Translates invitation-acceptance lifecycle and authorization failures. */
export const mapWorkspaceInvitationAcceptanceError = (
  invitationId: WorkspaceInvitationId,
  error: PostgrestErrorLike
): WorkspaceInvitationAcceptanceRepositoryError =>
  isInvitationResponseNotAllowed(error)
    ? new WorkspaceInvitationResponseNotAllowedError({ invitationId })
    : mapWorkspaceRepositoryError(error);

/** Translates invitation-decline lifecycle and authorization failures. */
export const mapWorkspaceInvitationDeclineError = (
  invitationId: WorkspaceInvitationId,
  error: PostgrestErrorLike
): WorkspaceInvitationDeclineRepositoryError =>
  isInvitationResponseNotAllowed(error)
    ? new WorkspaceInvitationResponseNotAllowedError({ invitationId })
    : mapWorkspaceRepositoryError(error);

/** Translates owner-list authorization and workspace lifecycle failures. */
export const mapWorkspaceInvitationOwnerReadError = (
  workspaceId: WorkspaceId,
  error: PostgrestErrorLike
): WorkspaceInvitationOwnerRepositoryReadError => {
  const message = error.message.toLowerCase();

  if (isWorkspaceCommandNotAllowed(error, message)) {
    return new WorkspaceInvitationManagementNotAllowedError({ workspaceId });
  }

  return mapWorkspaceRepositoryError(error);
};

/** Translates cancellation authorization and terminal-state failures. */
export const mapWorkspaceInvitationCancellationError = (
  invitationId: WorkspaceInvitationId,
  error: PostgrestErrorLike
): WorkspaceInvitationCancellationRepositoryError => {
  const message = error.message.toLowerCase();

  if (
    error.code === '28000' ||
    error.code === '42501' ||
    (error.code === 'P0002' &&
      (message.includes('workspace invitation') ||
        message.startsWith('workspace '))) ||
    (error.code === '55000' &&
      (message.includes('pending workspace invitation') ||
        (message.includes('workspace') && message.includes('not active'))))
  ) {
    return new WorkspaceInvitationCancellationNotAllowedError({
      invitationId,
    });
  }

  return mapWorkspaceRepositoryError(error);
};
