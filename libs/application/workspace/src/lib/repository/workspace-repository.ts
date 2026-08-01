import { Context, type Effect } from 'effect';
import type { ProfileId } from '@chat-hub/domain/profile';
import type {
  Workspace,
  WorkspaceId,
  WorkspaceMember,
  WorkspaceMemberRole,
} from '@chat-hub/domain/workspace';
import type {
  WorkspaceMemberAddRepositoryError,
  WorkspaceMemberRepositoryReadError,
  WorkspaceMemberRemovalRepositoryError,
  WorkspaceMemberRoleChangeRepositoryError,
  WorkspaceRepositoryCreateError,
  WorkspaceRepositoryReadError,
} from './workspace-repository-error';

/**
 * Validated values used to create a workspace for the authenticated user.
 */
export interface CreateWorkspaceCommand {
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
}

/**
 * Validated workspace and profile identities used to add a default member.
 */
export interface AddWorkspaceMemberCommand {
  readonly workspaceId: WorkspaceId;
  readonly profileId: ProfileId;
}

/**
 * Validated target and role used to change an active workspace membership.
 */
export interface ChangeWorkspaceMemberRoleCommand {
  readonly workspaceId: WorkspaceId;
  readonly profileId: ProfileId;
  readonly role: WorkspaceMemberRole;
}

/**
 * Validated target and optional audit reason used to remove a member.
 */
export interface RemoveWorkspaceMemberCommand {
  readonly workspaceId: WorkspaceId;
  readonly profileId: ProfileId;
  readonly reason: string | null;
}

/**
 * Outbound port for workspace discovery, membership discovery, creation, role
 * changes, and member removal.
 *
 * Implementations return active workspaces visible to the current
 * authenticated user and must validate external rows before returning them.
 */
export interface WorkspaceRepository {
  /**
   * Adds one active profile as a default member using session authorization.
   */
  readonly addMember: (
    command: AddWorkspaceMemberCommand
  ) => Effect.Effect<WorkspaceMember, WorkspaceMemberAddRepositoryError>;

  /**
   * Returns active workspaces visible to the current authenticated user.
   */
  readonly listAccessible: () => Effect.Effect<
    readonly Workspace[],
    WorkspaceRepositoryReadError
  >;

  /**
   * Returns active RLS-visible members belonging to one workspace.
   */
  readonly listActiveMembers: (
    workspaceId: WorkspaceId
  ) => Effect.Effect<
    readonly WorkspaceMember[],
    WorkspaceMemberRepositoryReadError
  >;

  /**
   * Creates a workspace owned by the provider-authenticated user.
   */
  readonly create: (
    command: CreateWorkspaceCommand
  ) => Effect.Effect<Workspace, WorkspaceRepositoryCreateError>;

  /**
   * Changes one active member's role using provider-session authorization.
   */
  readonly changeMemberRole: (
    command: ChangeWorkspaceMemberRoleCommand
  ) => Effect.Effect<WorkspaceMember, WorkspaceMemberRoleChangeRepositoryError>;

  /**
   * Removes one active member using provider-session authorization.
   *
   * The adapter validates the canonical removed membership before succeeding,
   * so no inactive membership is returned as an active domain value.
   */
  readonly removeMember: (
    command: RemoveWorkspaceMemberCommand
  ) => Effect.Effect<void, WorkspaceMemberRemovalRepositoryError>;
}

/**
 * Typed Effect service key for workspace and membership capabilities.
 *
 * Application programs yield this Tag to request a `WorkspaceRepository`.
 * Infrastructure supplies the concrete implementation through a Layer.
 */
export const WorkspaceRepositoryTag = Context.GenericTag<WorkspaceRepository>(
  '@chat-hub/application/workspace/WorkspaceRepository'
);
