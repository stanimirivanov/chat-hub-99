import type { Channel, ChannelId } from '@chat-hub/domain/channel';
import type { WorkspaceId } from '@chat-hub/domain/workspace';

export type ChannelLoadStatus = 'idle' | 'loading' | 'loaded' | 'failed';

/** Lifecycle of the selected workspace's channel observation. */
export type ChannelNavigationRealtimeStatus = 'idle' | 'observing' | 'failed';

/**
 * Lifecycle of the single in-flight channel creation operation.
 */
export type ChannelCreationStatus = 'idle' | 'creating' | 'failed';

/**
 * Lifecycle of the single selected-channel update operation.
 */
export type ChannelUpdateStatus = 'idle' | 'updating' | 'failed';

/**
 * Lifecycle of the serialized channel archive operation.
 */
export type ChannelArchiveStatus = 'idle' | 'archiving' | 'failed';

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
  readonly realtimeStatus: ChannelNavigationRealtimeStatus;
  readonly realtimeError: ChannelNavigationError | null;
  readonly creationStatus: ChannelCreationStatus;
  readonly creationError: ChannelNavigationError | null;
  readonly updateStatus: ChannelUpdateStatus;
  readonly updateError: ChannelNavigationError | null;
  readonly archiveStatus: ChannelArchiveStatus;
  readonly archivingChannelId: ChannelId | null;
  readonly archiveError: ChannelNavigationError | null;
}

export const initialChannelNavigationState: ChannelNavigationState = {
  workspaceId: null,
  channels: [],
  selectedChannelId: null,
  loadStatus: 'idle',
  error: null,
  realtimeStatus: 'idle',
  realtimeError: null,
  creationStatus: 'idle',
  creationError: null,
  updateStatus: 'idle',
  updateError: null,
  archiveStatus: 'idle',
  archivingChannelId: null,
  archiveError: null,
};
