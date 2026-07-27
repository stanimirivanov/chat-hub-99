import type { MessagePage } from '@chat-hub/application/message';
import type { ChannelId } from '@chat-hub/domain/message';

export type ChannelMessagesLoadStatus =
  | 'idle'
  | 'loading'
  | 'loaded'
  | 'failed';

export type OlderMessagesLoadStatus = 'idle' | 'loading' | 'failed';

export interface ChannelMessagesError {
  readonly tag: string;
  readonly message: string;
}

/**
 * State for the currently selected channel's message history.
 */
export interface ChannelMessagesState {
  readonly channelId: ChannelId | null;

  readonly messages: MessagePage['messages'];

  readonly nextCursor: MessagePage['nextCursor'];

  readonly loadStatus: ChannelMessagesLoadStatus;

  readonly olderMessagesStatus: OlderMessagesLoadStatus;

  readonly error: ChannelMessagesError | null;

  /**
   * Identifies the currently active request generation.
   *
   * Results from older generations are ignored when the user changes channels
   * before a request completes.
   */
  readonly requestGeneration: number;
}

export const initialChannelMessagesState: ChannelMessagesState = {
  channelId: null,
  messages: [],
  nextCursor: null,
  loadStatus: 'idle',
  olderMessagesStatus: 'idle',
  error: null,
  requestGeneration: 0,
};
