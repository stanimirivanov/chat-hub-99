import { Data } from 'effect';
import type { ProfileId } from '@chat-hub/domain/profile';
import type {
  WorkspaceId,
  WorkspaceMemberRole,
} from '@chat-hub/domain/workspace';

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

/**
 * Indicates that another current workspace already owns the requested slug.
 */
export class WorkspaceSlugUnavailableError extends Data.TaggedError(
  'WorkspaceSlugUnavailableError'
)<{
  readonly slug: string;
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

export type WorkspaceRepositoryReadError =
  | WorkspaceRepositoryUnavailableError
  | InvalidWorkspaceDataError;

export type WorkspaceMemberRepositoryReadError =
  | WorkspaceRepositoryUnavailableError
  | InvalidWorkspaceMemberDataError;

export type WorkspaceRepositoryCreateError =
  | WorkspaceRepositoryReadError
  | WorkspaceSlugUnavailableError;

export type WorkspaceMemberRoleChangeRepositoryError =
  | WorkspaceRepositoryUnavailableError
  | InvalidWorkspaceMemberDataError
  | WorkspaceMemberRoleChangeNotAllowedError
  | WorkspaceMemberNotFoundError
  | WorkspaceMemberNotActiveError
  | WorkspaceMemberRoleUnchangedError
  | WorkspaceLastOwnerDemotionError;
