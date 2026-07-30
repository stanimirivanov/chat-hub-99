import type { WorkspaceId } from '@chat-hub/domain/workspace';
import type { Workspace } from '@chat-hub/domain/workspace';

export type WorkspaceLoadStatus = 'idle' | 'loading' | 'loaded' | 'failed';

export interface WorkspaceNavigationError {
  readonly message: string;
}

export interface WorkspaceNavigationState {
  readonly workspaces: readonly Workspace[];
  readonly selectedWorkspaceId: WorkspaceId | null;
  readonly loadStatus: WorkspaceLoadStatus;
  readonly error: WorkspaceNavigationError | null;
}

export const initialWorkspaceNavigationState: WorkspaceNavigationState = {
  workspaces: [],
  selectedWorkspaceId: null,
  loadStatus: 'idle',
  error: null,
};
