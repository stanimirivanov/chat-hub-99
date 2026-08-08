import type { ArchivedChannel } from '@chat-hub/domain/channel';
import type { WorkspaceId } from '@chat-hub/domain/workspace';

export type ArchivedChannelLoadStatus =
  | 'idle'
  | 'loading'
  | 'loaded'
  | 'failed';

export interface ArchivedChannelListError {
  readonly message: string;
}

/** Workspace-keyed presentation state for archived-channel discovery. */
export interface ArchivedChannelListState {
  readonly workspaceId: WorkspaceId | null;
  readonly channels: readonly ArchivedChannel[];
  readonly loadStatus: ArchivedChannelLoadStatus;
  readonly error: ArchivedChannelListError | null;
}

export const initialArchivedChannelListState: ArchivedChannelListState = {
  workspaceId: null,
  channels: [],
  loadStatus: 'idle',
  error: null,
};
