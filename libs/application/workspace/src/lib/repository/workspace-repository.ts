import { Context, type Effect } from 'effect';
import type { Workspace } from '@chat-hub/domain/workspace';
import type {
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
 * Outbound port for workspace discovery and creation.
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
    WorkspaceRepositoryReadError
  >;

  /**
   * Creates a workspace owned by the provider-authenticated user.
   */
  readonly create: (
    command: CreateWorkspaceCommand
  ) => Effect.Effect<Workspace, WorkspaceRepositoryCreateError>;
}

/**
 * Typed Effect service key for workspace discovery and creation.
 *
 * Application programs yield this Tag to request a `WorkspaceRepository`.
 * Infrastructure supplies the concrete implementation through a Layer.
 */
export const WorkspaceRepositoryTag = Context.GenericTag<WorkspaceRepository>(
  '@chat-hub/application/workspace/WorkspaceRepository'
);
