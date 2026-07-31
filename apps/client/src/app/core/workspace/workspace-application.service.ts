import { Injectable } from '@angular/core';
import { Effect, Either } from 'effect';
import {
  createWorkspace,
  listAccessibleWorkspaces,
  type CreateWorkspaceError,
  type CreateWorkspaceInput,
  type WorkspaceRepositoryReadError,
} from '@chat-hub/application/workspace';
import type { Workspace } from '@chat-hub/domain/workspace';
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
   * Creates a workspace owned by the authenticated user.
   */
  createWorkspace(
    input: CreateWorkspaceInput
  ): Promise<Either.Either<Workspace, CreateWorkspaceError>> {
    return applicationRuntime.runPromise(
      createWorkspace(input).pipe(Effect.either)
    );
  }
}
