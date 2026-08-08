import type { ArchivedWorkspace } from '@chat-hub/domain/workspace';

export type ArchivedWorkspaceLoadStatus =
  | 'idle'
  | 'loading'
  | 'loaded'
  | 'failed';

export interface ArchivedWorkspaceListError {
  readonly message: string;
}

/** Independent presentation state for archived-workspace discovery. */
export interface ArchivedWorkspaceListState {
  readonly workspaces: readonly ArchivedWorkspace[];
  readonly loadStatus: ArchivedWorkspaceLoadStatus;
  readonly error: ArchivedWorkspaceListError | null;
}

export const initialArchivedWorkspaceListState: ArchivedWorkspaceListState = {
  workspaces: [],
  loadStatus: 'idle',
  error: null,
};
