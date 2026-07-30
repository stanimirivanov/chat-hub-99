import { Injectable } from '@angular/core';
import { Effect, Either } from 'effect';
import {
  listAccessibleWorkspaces,
  type WorkspaceRepositoryError,
} from '@chat-hub/application/workspace';
import type { Workspace } from '@chat-hub/domain/workspace';
import { applicationRuntime } from '../effect/application-runtime';

/**
 * Angular execution boundary for workspace application programs.
 */
@Injectable({
  providedIn: 'root',
})
export class WorkspaceApplicationService {
  listAccessibleWorkspaces(): Promise<
    Either.Either<readonly Workspace[], WorkspaceRepositoryError>
  > {
    return applicationRuntime.runPromise(
      listAccessibleWorkspaces.pipe(Effect.either)
    );
  }
}
