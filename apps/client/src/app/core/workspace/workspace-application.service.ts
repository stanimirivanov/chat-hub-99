import { Injectable } from '@angular/core';
import { Effect, Either } from 'effect';
import {
  addWorkspaceMemberByUsername,
  changeWorkspaceMemberRole,
  createWorkspace,
  listAccessibleWorkspaces,
  listWorkspaceMembers,
  removeWorkspaceMember,
  updateWorkspace,
  type AddedWorkspaceMember,
  type AddWorkspaceMemberByUsernameError,
  type AddWorkspaceMemberByUsernameInput,
  type ChangeWorkspaceMemberRoleError,
  type ChangeWorkspaceMemberRoleInput,
  type CreateWorkspaceError,
  type CreateWorkspaceInput,
  type RemoveWorkspaceMemberError,
  type RemoveWorkspaceMemberInput,
  type WorkspaceMemberRepositoryReadError,
  type WorkspaceRepositoryReadError,
  type UpdateWorkspaceError,
  type UpdateWorkspaceInput,
} from '@chat-hub/application/workspace';
import type {
  Workspace,
  WorkspaceId,
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
   * Lists active members visible in one selected workspace.
   */
  listWorkspaceMembers(
    workspaceId: WorkspaceId
  ): Promise<
    Either.Either<
      readonly WorkspaceMember[],
      WorkspaceMemberRepositoryReadError
    >
  > {
    return applicationRuntime.runPromise(
      listWorkspaceMembers(workspaceId).pipe(Effect.either)
    );
  }

  /**
   * Resolves one active profile by exact username and adds it as a member.
   */
  addWorkspaceMemberByUsername(
    input: AddWorkspaceMemberByUsernameInput
  ): Promise<
    Either.Either<AddedWorkspaceMember, AddWorkspaceMemberByUsernameError>
  > {
    return applicationRuntime.runPromise(
      addWorkspaceMemberByUsername(input).pipe(Effect.either)
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
}
