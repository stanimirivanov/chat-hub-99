import type { WorkspaceId } from '@chat-hub/domain/workspace';
import type { Workspace } from '@chat-hub/domain/workspace';

/**
 * Lifecycle of accessible-workspace discovery.
 */
export type WorkspaceLoadStatus = 'idle' | 'loading' | 'loaded' | 'failed';

/**
 * Safe failure information rendered by workspace navigation.
 */
export interface WorkspaceNavigationError {
  readonly message: string;
}

/**
 * Presentation state for workspace discovery and explicit selection.
 */
export interface WorkspaceNavigationState {
  readonly workspaces: readonly Workspace[];
  readonly selectedWorkspaceId: WorkspaceId | null;
  readonly loadStatus: WorkspaceLoadStatus;
  readonly error: WorkspaceNavigationError | null;
}

/**
 * Fresh feature state before workspace discovery begins.
 */
export const initialWorkspaceNavigationState: WorkspaceNavigationState = {
  workspaces: [],
  selectedWorkspaceId: null,
  loadStatus: 'idle',
  error: null,
};
