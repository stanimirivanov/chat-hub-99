import { Injectable } from '@angular/core';
import { Effect, Either, Fiber, Stream } from 'effect';
import {
  acceptWorkspaceInvitation,
  archiveWorkspace,
  cancelWorkspaceInvitation,
  changeWorkspaceMemberRole,
  createWorkspace,
  declineWorkspaceInvitation,
  inviteWorkspaceMemberByUsername,
  listPendingWorkspaceInvitations,
  listPendingWorkspaceInvitationsForOwner,
  listAccessibleWorkspaces,
  observeAccessibleWorkspaces,
  listWorkspaceMembers,
  leaveWorkspace,
  removeWorkspaceMember,
  suspendWorkspaceMember,
  updateWorkspace,
  type AcceptWorkspaceInvitationError,
  type AcceptWorkspaceInvitationInput,
  type ArchiveWorkspaceError,
  type ArchiveWorkspaceInput,
  type CancelWorkspaceInvitationError,
  type CancelWorkspaceInvitationInput,
  type ChangeWorkspaceMemberRoleError,
  type ChangeWorkspaceMemberRoleInput,
  type CreateWorkspaceError,
  type CreateWorkspaceInput,
  type DeclineWorkspaceInvitationError,
  type DeclineWorkspaceInvitationInput,
  type InviteWorkspaceMemberByUsernameError,
  type InviteWorkspaceMemberByUsernameInput,
  type PendingWorkspaceInvitation,
  type PendingWorkspaceInvitationForOwner,
  type ListPendingWorkspaceInvitationsForOwnerError,
  type ListPendingWorkspaceInvitationsForOwnerInput,
  type WorkspaceInvitationRepositoryReadError,
  type LeaveWorkspaceError,
  type LeaveWorkspaceInput,
  type RemoveWorkspaceMemberError,
  type RemoveWorkspaceMemberInput,
  type SuspendWorkspaceMemberError,
  type SuspendWorkspaceMemberInput,
  type ListWorkspaceMembersError,
  type WorkspaceMemberCursor,
  type WorkspaceMemberPage,
  type WorkspaceRepositoryReadError,
  type UpdateWorkspaceError,
  type UpdateWorkspaceInput,
} from '@chat-hub/application/workspace';
import type {
  Workspace,
  WorkspaceId,
  WorkspaceInvitation,
  WorkspaceMember,
} from '@chat-hub/domain/workspace';
import { applicationRuntime } from '../effect/application-runtime';

/**
 * Angular execution boundary for workspace application programs.
 *
 * The application use case remains a lazy Effect. This service runs it through
 * the shared managed runtime and exposes an Angular-friendly Promise. Turning
 * the typed failure channel into `Either` keeps expected repository failures
 * as values instead of rejected Promises.
 */
@Injectable({
  providedIn: 'root',
})
export class WorkspaceApplicationService {
  /**
   * Archives one workspace using provider-session authorization.
   */
  archiveWorkspace(
    input: ArchiveWorkspaceInput
  ): Promise<Either.Either<void, ArchiveWorkspaceError>> {
    return applicationRuntime.runPromise(
      archiveWorkspace(input).pipe(Effect.either)
    );
  }

  /**
   * Lists active workspaces visible to the authenticated user.
   */
  listAccessibleWorkspaces(): Promise<
    Either.Either<readonly Workspace[], WorkspaceRepositoryReadError>
  > {
    return applicationRuntime.runPromise(
      listAccessibleWorkspaces.pipe(Effect.either)
    );
  }

  /**
   * Starts a private observation of authoritative accessible-workspace
   * snapshots for the authenticated user.
   *
   * The returned cleanup function interrupts the Effect Fiber, which releases
   * the underlying Supabase Realtime channel.
   */
  observeAccessibleWorkspaces(
    onWorkspaces: (workspaces: readonly Workspace[]) => void,
    onError: (error: WorkspaceRepositoryReadError) => void
  ): () => void {
    const program = observeAccessibleWorkspaces.pipe(
      Stream.runForEach((workspaces) =>
        Effect.sync(() => {
          onWorkspaces(workspaces);
        })
      ),
      Effect.catchAll((error) =>
        Effect.sync(() => {
          onError(error);
        })
      )
    );
    const fiber = applicationRuntime.runFork(program);

    return () => {
      void applicationRuntime.runPromise(Fiber.interrupt(fiber));
    };
  }

  /**
   * Lists active members visible in one selected workspace.
   */
  listWorkspaceMembers(
    workspaceId: WorkspaceId,
    after?: WorkspaceMemberCursor
  ): Promise<Either.Either<WorkspaceMemberPage, ListWorkspaceMembersError>> {
    return applicationRuntime.runPromise(
      listWorkspaceMembers({ workspaceId, after }).pipe(Effect.either)
    );
  }

  /**
   * Removes the authenticated user's own active workspace membership.
   */
  leaveWorkspace(
    input: LeaveWorkspaceInput
  ): Promise<Either.Either<void, LeaveWorkspaceError>> {
    return applicationRuntime.runPromise(
      leaveWorkspace(input).pipe(Effect.either)
    );
  }

  /**
   * Changes one active workspace member's role using session authorization.
   */
  changeWorkspaceMemberRole(
    input: ChangeWorkspaceMemberRoleInput
  ): Promise<Either.Either<WorkspaceMember, ChangeWorkspaceMemberRoleError>> {
    return applicationRuntime.runPromise(
      changeWorkspaceMemberRole(input).pipe(Effect.either)
    );
  }

  /**
   * Removes one active workspace member using session authorization.
   */
  removeWorkspaceMember(
    input: RemoveWorkspaceMemberInput
  ): Promise<Either.Either<void, RemoveWorkspaceMemberError>> {
    return applicationRuntime.runPromise(
      removeWorkspaceMember(input).pipe(Effect.either)
    );
  }

  /**
   * Suspends one active workspace member using session authorization.
   */
  suspendWorkspaceMember(
    input: SuspendWorkspaceMemberInput
  ): Promise<Either.Either<void, SuspendWorkspaceMemberError>> {
    return applicationRuntime.runPromise(
      suspendWorkspaceMember(input).pipe(Effect.either)
    );
  }

  /**
   * Creates a workspace owned by the authenticated user.
   */
  createWorkspace(
    input: CreateWorkspaceInput
  ): Promise<Either.Either<Workspace, CreateWorkspaceError>> {
    return applicationRuntime.runPromise(
      createWorkspace(input).pipe(Effect.either)
    );
  }

  /**
   * Replaces one active workspace's mutable details using session authorization.
   */
  updateWorkspace(
    input: UpdateWorkspaceInput
  ): Promise<Either.Either<Workspace, UpdateWorkspaceError>> {
    return applicationRuntime.runPromise(
      updateWorkspace(input).pipe(Effect.either)
    );
  }

  /** Creates a pending invitation for one exact active username. */
  inviteWorkspaceMemberByUsername(
    input: InviteWorkspaceMemberByUsernameInput
  ): Promise<
    Either.Either<WorkspaceInvitation, InviteWorkspaceMemberByUsernameError>
  > {
    return applicationRuntime.runPromise(
      inviteWorkspaceMemberByUsername(input).pipe(Effect.either)
    );
  }

  /** Lists pending invitations addressed to the authenticated user. */
  listPendingWorkspaceInvitations(): Promise<
    Either.Either<
      readonly PendingWorkspaceInvitation[],
      WorkspaceInvitationRepositoryReadError
    >
  > {
    return applicationRuntime.runPromise(
      listPendingWorkspaceInvitations.pipe(Effect.either)
    );
  }

  /** Accepts one pending invitation as its authenticated recipient. */
  acceptWorkspaceInvitation(
    input: AcceptWorkspaceInvitationInput
  ): Promise<Either.Either<WorkspaceMember, AcceptWorkspaceInvitationError>> {
    return applicationRuntime.runPromise(
      acceptWorkspaceInvitation(input).pipe(Effect.either)
    );
  }

  /** Declines one pending invitation as its authenticated recipient. */
  declineWorkspaceInvitation(
    input: DeclineWorkspaceInvitationInput
  ): Promise<Either.Either<void, DeclineWorkspaceInvitationError>> {
    return applicationRuntime.runPromise(
      declineWorkspaceInvitation(input).pipe(Effect.either)
    );
  }

  /** Lists pending invitations managed by an active selected-workspace owner. */
  listPendingWorkspaceInvitationsForOwner(
    input: ListPendingWorkspaceInvitationsForOwnerInput
  ): Promise<
    Either.Either<
      readonly PendingWorkspaceInvitationForOwner[],
      ListPendingWorkspaceInvitationsForOwnerError
    >
  > {
    return applicationRuntime.runPromise(
      listPendingWorkspaceInvitationsForOwner(input).pipe(Effect.either)
    );
  }

  /** Cancels one pending invitation using its workspace owner's authority. */
  cancelWorkspaceInvitation(
    input: CancelWorkspaceInvitationInput
  ): Promise<Either.Either<void, CancelWorkspaceInvitationError>> {
    return applicationRuntime.runPromise(
      cancelWorkspaceInvitation(input).pipe(Effect.either)
    );
  }
}
