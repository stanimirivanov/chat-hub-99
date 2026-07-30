import { Context, type Effect } from 'effect';
import type { Workspace } from '@chat-hub/domain/workspace';
import type { WorkspaceRepositoryError } from './workspace-repository-error';

/**
 * Outbound port for workspace discovery.
 *
 * Implementations return active workspaces visible to the current
 * authenticated user and must validate external rows before returning them.
 */
export interface WorkspaceRepository {
  /**
   * Returns active workspaces visible to the current authenticated user.
   */
  readonly listAccessible: () => Effect.Effect<
    readonly Workspace[],
    WorkspaceRepositoryError
  >;
}

/**
 * Typed Effect service key for workspace discovery.
 *
 * Application programs yield this Tag to request a `WorkspaceRepository`.
 * Infrastructure supplies the concrete implementation through a Layer.
 */
export const WorkspaceRepositoryTag = Context.GenericTag<WorkspaceRepository>(
  '@chat-hub/application/workspace/WorkspaceRepository'
);
