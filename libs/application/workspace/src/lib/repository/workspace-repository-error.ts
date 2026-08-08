import { Data } from 'effect';
import type { ProfileId } from '@omoikane/domain/profile';
import type {
  WorkspaceId,
  WorkspaceInvitationId,
  WorkspaceMemberRole,
} from '@omoikane/domain/workspace';

/**
 * Indicates that a workspace or membership operation could not reach its
 * provider.
 */
export class WorkspaceRepositoryUnavailableError extends Data.TaggedError(
  'WorkspaceRepositoryUnavailableError'
)<{
  readonly cause: unknown;
}> {}

/**
 * Indicates that an external workspace row violated the domain contract.
 */
export class InvalidWorkspaceDataError extends Data.TaggedError(
  'InvalidWorkspaceDataError'
)<{
  readonly cause: unknown;
}> {}

/**
 * Indicates that an external membership row violated the domain contract.
 */
export class InvalidWorkspaceMemberDataError extends Data.TaggedError(
  'InvalidWorkspaceMemberDataError'
)<{
  readonly cause: unknown;
}> {}

/** Indicates that an external invitation projection violated its contract. */
export class InvalidWorkspaceInvitationDataError extends Data.TaggedError(
  'InvalidWorkspaceInvitationDataError'
)<{
  readonly cause: unknown;
}> {}

/**
 * Indicates that another current workspace already owns the requested slug.
 */
export class WorkspaceSlugUnavailableError extends Data.TaggedError(
  'WorkspaceSlugUnavailableError'
)<{
  readonly slug: string;
}> {}

/**
 * Indicates that the current session or workspace state forbids an update.
 */
export class WorkspaceUpdateNotAllowedError extends Data.TaggedError(
  'WorkspaceUpdateNotAllowedError'
)<{
  readonly workspaceId: WorkspaceId;
}> {}

/**
 * Indicates that the current session or workspace state forbids archiving.
 */
export class WorkspaceArchiveNotAllowedError extends Data.TaggedError(
  'WorkspaceArchiveNotAllowedError'
)<{
  readonly workspaceId: WorkspaceId;
}> {}

/** Indicates that the current session or lifecycle forbids restoration. */
export class WorkspaceRestoreNotAllowedError extends Data.TaggedError(
  'WorkspaceRestoreNotAllowedError'
)<{
  readonly workspaceId: WorkspaceId;
}> {}

/**
 * Indicates that the current session or workspace state forbids member addition.
 */
export class WorkspaceMemberAdditionNotAllowedError extends Data.TaggedError(
  'WorkspaceMemberAdditionNotAllowedError'
)<{
  readonly workspaceId: WorkspaceId;
}> {}

/**
 * Indicates that the selected profile became inactive before member creation.
 */
export class WorkspaceMemberProfileNotActiveError extends Data.TaggedError(
  'WorkspaceMemberProfileNotActiveError'
)<{
  readonly workspaceId: WorkspaceId;
  readonly profileId: ProfileId;
}> {}

/**
 * Indicates that the profile already has an active workspace membership.
 */
export class WorkspaceMemberAlreadyActiveError extends Data.TaggedError(
  'WorkspaceMemberAlreadyActiveError'
)<{
  readonly workspaceId: WorkspaceId;
  readonly profileId: ProfileId;
}> {}

/**
 * Indicates that preserved membership history is not in a state that the
 * add-member command may reactivate.
 */
export class WorkspaceMemberReactivationNotAllowedError extends Data.TaggedError(
  'WorkspaceMemberReactivationNotAllowedError'
)<{
  readonly workspaceId: WorkspaceId;
  readonly profileId: ProfileId;
}> {}

/** Indicates that the current session may not create the invitation. */
export class WorkspaceInvitationCreationNotAllowedError extends Data.TaggedError(
  'WorkspaceInvitationCreationNotAllowedError'
)<{
  readonly workspaceId: WorkspaceId;
}> {}

/** Indicates that the selected profile is no longer active. */
export class WorkspaceInvitationProfileNotActiveError extends Data.TaggedError(
  'WorkspaceInvitationProfileNotActiveError'
)<{
  readonly workspaceId: WorkspaceId;
  readonly profileId: ProfileId;
}> {}

/** Indicates that the selected profile already has active workspace access. */
export class WorkspaceInvitationMemberAlreadyActiveError extends Data.TaggedError(
  'WorkspaceInvitationMemberAlreadyActiveError'
)<{
  readonly workspaceId: WorkspaceId;
  readonly profileId: ProfileId;
}> {}

/** Indicates that consent is already awaiting the selected profile. */
export class WorkspaceInvitationAlreadyPendingError extends Data.TaggedError(
  'WorkspaceInvitationAlreadyPendingError'
)<{
  readonly workspaceId: WorkspaceId;
  readonly profileId: ProfileId;
}> {}

/** Indicates that an invitation cannot be answered in the current state. */
export class WorkspaceInvitationResponseNotAllowedError extends Data.TaggedError(
  'WorkspaceInvitationResponseNotAllowedError'
)<{
  readonly invitationId: WorkspaceInvitationId;
}> {}

/** Indicates that the current session may not manage invitations here. */
export class WorkspaceInvitationManagementNotAllowedError extends Data.TaggedError(
  'WorkspaceInvitationManagementNotAllowedError'
)<{
  readonly workspaceId: WorkspaceId;
}> {}

/** Indicates that an invitation cannot be cancelled in its current state. */
export class WorkspaceInvitationCancellationNotAllowedError extends Data.TaggedError(
  'WorkspaceInvitationCancellationNotAllowedError'
)<{
  readonly invitationId: WorkspaceInvitationId;
}> {}

/**
 * Indicates that the current session cannot change roles in this workspace.
 */
export class WorkspaceMemberRoleChangeNotAllowedError extends Data.TaggedError(
  'WorkspaceMemberRoleChangeNotAllowedError'
)<{
  readonly workspaceId: WorkspaceId;
}> {}

/**
 * Indicates that the requested profile has no membership in the workspace.
 */
export class WorkspaceMemberNotFoundError extends Data.TaggedError(
  'WorkspaceMemberNotFoundError'
)<{
  readonly workspaceId: WorkspaceId;
  readonly profileId: ProfileId;
}> {}

/**
 * Indicates that the target membership is no longer active.
 */
export class WorkspaceMemberNotActiveError extends Data.TaggedError(
  'WorkspaceMemberNotActiveError'
)<{
  readonly workspaceId: WorkspaceId;
  readonly profileId: ProfileId;
}> {}

/**
 * Indicates that the membership already has the requested role.
 */
export class WorkspaceMemberRoleUnchangedError extends Data.TaggedError(
  'WorkspaceMemberRoleUnchangedError'
)<{
  readonly workspaceId: WorkspaceId;
  readonly profileId: ProfileId;
  readonly role: WorkspaceMemberRole;
}> {}

/**
 * Indicates that the requested demotion would leave no active owner.
 */
export class WorkspaceLastOwnerDemotionError extends Data.TaggedError(
  'WorkspaceLastOwnerDemotionError'
)<{
  readonly workspaceId: WorkspaceId;
  readonly profileId: ProfileId;
}> {}

/**
 * Indicates that the current session or workspace state forbids removal.
 */
export class WorkspaceMemberRemovalNotAllowedError extends Data.TaggedError(
  'WorkspaceMemberRemovalNotAllowedError'
)<{
  readonly workspaceId: WorkspaceId;
}> {}

/**
 * Indicates that removal would leave no active workspace owner.
 */
export class WorkspaceLastOwnerRemovalError extends Data.TaggedError(
  'WorkspaceLastOwnerRemovalError'
)<{
  readonly workspaceId: WorkspaceId;
  readonly profileId: ProfileId;
}> {}

/**
 * Indicates that the current session or workspace state forbids suspension.
 */
export class WorkspaceMemberSuspensionNotAllowedError extends Data.TaggedError(
  'WorkspaceMemberSuspensionNotAllowedError'
)<{
  readonly workspaceId: WorkspaceId;
}> {}

/**
 * Indicates that suspension would leave no active workspace owner.
 */
export class WorkspaceLastOwnerSuspensionError extends Data.TaggedError(
  'WorkspaceLastOwnerSuspensionError'
)<{
  readonly workspaceId: WorkspaceId;
  readonly profileId: ProfileId;
}> {}

/**
 * Indicates that the authenticated user or workspace cannot be departed from
 * its current provider state.
 */
export class WorkspaceDepartureNotAllowedError extends Data.TaggedError(
  'WorkspaceDepartureNotAllowedError'
)<{
  readonly workspaceId: WorkspaceId;
}> {}

/**
 * Indicates that departure would leave no active workspace owner.
 */
export class WorkspaceLastOwnerDepartureError extends Data.TaggedError(
  'WorkspaceLastOwnerDepartureError'
)<{
  readonly workspaceId: WorkspaceId;
}> {}

export type WorkspaceRepositoryReadError =
  | WorkspaceRepositoryUnavailableError
  | InvalidWorkspaceDataError;

export type WorkspaceMemberRepositoryReadError =
  | WorkspaceRepositoryUnavailableError
  | InvalidWorkspaceMemberDataError;

export type WorkspaceRepositoryCreateError =
  | WorkspaceRepositoryReadError
  | WorkspaceSlugUnavailableError;

export type WorkspaceRepositoryUpdateError =
  | WorkspaceRepositoryReadError
  | WorkspaceSlugUnavailableError
  | WorkspaceUpdateNotAllowedError;

export type WorkspaceRepositoryArchiveError =
  | WorkspaceRepositoryUnavailableError
  | InvalidWorkspaceDataError
  | WorkspaceArchiveNotAllowedError;

export type WorkspaceRepositoryRestoreError =
  | WorkspaceRepositoryReadError
  | WorkspaceRestoreNotAllowedError;

export type WorkspaceMemberAddRepositoryError =
  | WorkspaceRepositoryUnavailableError
  | InvalidWorkspaceMemberDataError
  | WorkspaceMemberAdditionNotAllowedError
  | WorkspaceMemberProfileNotActiveError
  | WorkspaceMemberAlreadyActiveError
  | WorkspaceMemberReactivationNotAllowedError;

export type WorkspaceMemberRoleChangeRepositoryError =
  | WorkspaceRepositoryUnavailableError
  | InvalidWorkspaceMemberDataError
  | WorkspaceMemberRoleChangeNotAllowedError
  | WorkspaceMemberNotFoundError
  | WorkspaceMemberNotActiveError
  | WorkspaceMemberRoleUnchangedError
  | WorkspaceLastOwnerDemotionError;

export type WorkspaceMemberRemovalRepositoryError =
  | WorkspaceRepositoryUnavailableError
  | InvalidWorkspaceMemberDataError
  | WorkspaceMemberRemovalNotAllowedError
  | WorkspaceMemberNotFoundError
  | WorkspaceMemberNotActiveError
  | WorkspaceLastOwnerRemovalError;

export type WorkspaceMemberSuspensionRepositoryError =
  | WorkspaceRepositoryUnavailableError
  | InvalidWorkspaceMemberDataError
  | WorkspaceMemberSuspensionNotAllowedError
  | WorkspaceMemberNotFoundError
  | WorkspaceMemberNotActiveError
  | WorkspaceLastOwnerSuspensionError;

export type WorkspaceDepartureRepositoryError =
  | WorkspaceRepositoryUnavailableError
  | InvalidWorkspaceMemberDataError
  | WorkspaceDepartureNotAllowedError
  | WorkspaceLastOwnerDepartureError;

export type WorkspaceInvitationCreationRepositoryError =
  | WorkspaceRepositoryUnavailableError
  | InvalidWorkspaceInvitationDataError
  | WorkspaceInvitationCreationNotAllowedError
  | WorkspaceInvitationProfileNotActiveError
  | WorkspaceInvitationMemberAlreadyActiveError
  | WorkspaceInvitationAlreadyPendingError;

export type WorkspaceInvitationRepositoryReadError =
  | WorkspaceRepositoryUnavailableError
  | InvalidWorkspaceInvitationDataError
  | InvalidWorkspaceDataError;

export type WorkspaceInvitationAcceptanceRepositoryError =
  | WorkspaceRepositoryUnavailableError
  | InvalidWorkspaceMemberDataError
  | WorkspaceInvitationResponseNotAllowedError;

export type WorkspaceInvitationDeclineRepositoryError =
  | WorkspaceRepositoryUnavailableError
  | InvalidWorkspaceInvitationDataError
  | WorkspaceInvitationResponseNotAllowedError;

export type WorkspaceInvitationOwnerRepositoryReadError =
  | WorkspaceRepositoryUnavailableError
  | InvalidWorkspaceInvitationDataError
  | WorkspaceInvitationManagementNotAllowedError;

export type WorkspaceInvitationCancellationRepositoryError =
  | WorkspaceRepositoryUnavailableError
  | InvalidWorkspaceInvitationDataError
  | WorkspaceInvitationCancellationNotAllowedError;
