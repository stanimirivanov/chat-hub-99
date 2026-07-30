import type { Channel, ChannelId } from '@chat-hub/domain/channel';
import type { WorkspaceId } from '@chat-hub/domain/workspace';

export type ChannelLoadStatus = 'idle' | 'loading' | 'loaded' | 'failed';

export interface ChannelNavigationError {
  readonly message: string;
}

/**
 * Presentation state for channel discovery inside one selected workspace.
 */
export interface ChannelNavigationState {
  readonly workspaceId: WorkspaceId | null;
  readonly channels: readonly Channel[];
  readonly selectedChannelId: ChannelId | null;
  readonly loadStatus: ChannelLoadStatus;
  readonly error: ChannelNavigationError | null;
}

export const initialChannelNavigationState: ChannelNavigationState = {
  workspaceId: null,
  channels: [],
  selectedChannelId: null,
  loadStatus: 'idle',
  error: null,
};
