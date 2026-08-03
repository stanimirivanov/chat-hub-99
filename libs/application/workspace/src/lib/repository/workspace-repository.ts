import { Context, type Effect, type Stream } from 'effect';
import type { ProfileId } from '@chat-hub/domain/profile';
import type {
  Workspace,
  WorkspaceId,
  WorkspaceInvitation,
  WorkspaceInvitationId,
  WorkspaceMember,
  WorkspaceMemberRole,
} from '@chat-hub/domain/workspace';
import type {
  WorkspaceMemberAddRepositoryError,
  WorkspaceDepartureRepositoryError,
  WorkspaceMemberRepositoryReadError,
  WorkspaceMemberRemovalRepositoryError,
  WorkspaceMemberRoleChangeRepositoryError,
  WorkspaceMemberSuspensionRepositoryError,
  WorkspaceInvitationAcceptanceRepositoryError,
  WorkspaceInvitationCancellationRepositoryError,
  WorkspaceInvitationCreationRepositoryError,
  WorkspaceInvitationDeclineRepositoryError,
  WorkspaceInvitationOwnerRepositoryReadError,
  WorkspaceInvitationRepositoryReadError,
  WorkspaceRepositoryCreateError,
  WorkspaceRepositoryArchiveError,
  WorkspaceRepositoryReadError,
  WorkspaceRepositoryUnavailableError,
  WorkspaceRepositoryUpdateError,
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
 * Validated replacement details for one existing workspace.
 */
export interface UpdateWorkspaceCommand extends CreateWorkspaceCommand {
  readonly workspaceId: WorkspaceId;
}

/**
 * Validated identities used to add or reactivate a default member.
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
 * Validated target and optional audit reason used to suspend a member.
 */
export interface SuspendWorkspaceMemberCommand {
  readonly workspaceId: WorkspaceId;
  readonly profileId: ProfileId;
  readonly reason: string | null;
}

/**
 * Validated identities used to invite one active profile without granting
 * immediate workspace access.
 */
export interface InviteWorkspaceMemberCommand {
  readonly workspaceId: WorkspaceId;
  readonly profileId: ProfileId;
}

/**
 * Pending invitation enriched with the independently mutable workspace
 * projection needed by recipient presentation.
 */
export interface PendingWorkspaceInvitation {
  readonly invitation: WorkspaceInvitation;
  readonly workspace: Workspace;
}

/** Pending invitation with the current username needed by owner presentation. */
export interface PendingWorkspaceInvitationForOwner {
  readonly invitation: WorkspaceInvitation;
  readonly username: string | null;
}

/**
 * Outbound port for workspace discovery, workspace commands, membership
 * administration, and invitation consent.
 *
 * Implementations return active workspaces visible to the current
 * authenticated user and must validate external rows before returning them.
 */
export interface WorkspaceRepository {
  /**
   * Signals when the authenticated user's accessible-workspace projection may
   * have changed.
   *
   * The stream emits once after its provider listener is ready and again for
   * every subsequent access invalidation. Interrupting it must release that
   * listener. Callers reload through `listAccessible`; event payloads are not
   * an authoritative workspace projection.
   */
  readonly accessChanges: () => Stream.Stream<
    void,
    WorkspaceRepositoryUnavailableError
  >;

  /**
   * Archives one active workspace using provider-session authorization.
   *
   * The implementation validates the archived provider result before
   * acknowledging success, so no archived row crosses as an active workspace.
   */
  readonly archive: (
    workspaceId: WorkspaceId
  ) => Effect.Effect<void, WorkspaceRepositoryArchiveError>;

  /**
   * Adds or reactivates one active profile as a default member using session
   * authorization.
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
   * Leaves the provider-authenticated user's own active membership.
   *
   * The authenticated identity is deliberately absent from the contract so a
   * caller cannot request departure on behalf of another member.
   */
  readonly leave: (
    workspaceId: WorkspaceId
  ) => Effect.Effect<void, WorkspaceDepartureRepositoryError>;

  /**
   * Creates a workspace owned by the provider-authenticated user.
   */
  readonly create: (
    command: CreateWorkspaceCommand
  ) => Effect.Effect<Workspace, WorkspaceRepositoryCreateError>;

  /**
   * Replaces an active workspace's mutable details using session authorization.
   */
  readonly update: (
    command: UpdateWorkspaceCommand
  ) => Effect.Effect<Workspace, WorkspaceRepositoryUpdateError>;

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

  /**
   * Suspends one active member using provider-session authorization.
   *
   * The adapter validates the canonical suspended membership before
   * succeeding, so no inactive membership crosses as an active domain value.
   */
  readonly suspendMember: (
    command: SuspendWorkspaceMemberCommand
  ) => Effect.Effect<void, WorkspaceMemberSuspensionRepositoryError>;

  /** Creates one pending invitation using provider-session owner authority. */
  readonly inviteMember: (
    command: InviteWorkspaceMemberCommand
  ) => Effect.Effect<
    WorkspaceInvitation,
    WorkspaceInvitationCreationRepositoryError
  >;

  /** Lists pending invitations addressed to the provider-authenticated user. */
  readonly listPendingInvitations: () => Effect.Effect<
    readonly PendingWorkspaceInvitation[],
    WorkspaceInvitationRepositoryReadError
  >;

  /** Accepts one invitation as its authenticated recipient. */
  readonly acceptInvitation: (
    invitationId: WorkspaceInvitationId
  ) => Effect.Effect<
    WorkspaceMember,
    WorkspaceInvitationAcceptanceRepositoryError
  >;

  /** Declines one invitation as its authenticated recipient. */
  readonly declineInvitation: (
    invitationId: WorkspaceInvitationId
  ) => Effect.Effect<void, WorkspaceInvitationDeclineRepositoryError>;

  /** Lists pending invitations in a workspace using authenticated owner authority. */
  readonly listPendingInvitationsForWorkspace: (
    workspaceId: WorkspaceId
  ) => Effect.Effect<
    readonly PendingWorkspaceInvitationForOwner[],
    WorkspaceInvitationOwnerRepositoryReadError
  >;

  /** Cancels one invitation using authenticated authority over its workspace. */
  readonly cancelInvitation: (
    invitationId: WorkspaceInvitationId
  ) => Effect.Effect<void, WorkspaceInvitationCancellationRepositoryError>;
}

/**
 * Typed Effect service key for workspace, membership, and invitation
 * capabilities.
 *
 * Application programs yield this Tag to request a `WorkspaceRepository`.
 * Infrastructure supplies the concrete implementation through a Layer.
 */
export const WorkspaceRepositoryTag = Context.GenericTag<WorkspaceRepository>(
  '@chat-hub/application/workspace/WorkspaceRepository'
);
