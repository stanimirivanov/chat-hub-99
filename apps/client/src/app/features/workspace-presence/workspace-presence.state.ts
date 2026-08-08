import type { ProfileId } from '@omoikane/domain/profile';
import type { WorkspaceId } from '@omoikane/domain/workspace';

/** Lifecycle of one selected-workspace Presence subscription. */
export type WorkspacePresenceStatus =
  | 'idle'
  | 'connecting'
  | 'observing'
  | 'failed';

/** Safe failure information rendered by workspace presence. */
export interface WorkspacePresenceError {
  readonly message: string;
}

/** Presentation state for ephemeral workspace presence. */
export interface WorkspacePresenceState {
  readonly workspaceId: WorkspaceId | null;
  readonly onlineProfileIds: readonly ProfileId[];
  readonly status: WorkspacePresenceStatus;
  readonly error: WorkspacePresenceError | null;
}

/** Fresh state before a workspace is selected. */
export const initialWorkspacePresenceState: WorkspacePresenceState = {
  workspaceId: null,
  onlineProfileIds: [],
  status: 'idle',
  error: null,
};
