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
  readonly listAccessible: () => Effect.Effect<
    readonly Workspace[],
    WorkspaceRepositoryError
  >;
}

export const WorkspaceRepositoryTag = Context.GenericTag<WorkspaceRepository>(
  '@chat-hub/application/workspace/WorkspaceRepository'
);
