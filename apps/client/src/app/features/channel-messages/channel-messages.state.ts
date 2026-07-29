import type { MessagePage } from '@chat-hub/application/message';
import type { ChannelId } from '@chat-hub/domain/message';

/** Lifecycle of the newest-page request for the selected channel. */
export type ChannelMessagesLoadStatus =
  | 'idle'
  | 'loading'
  | 'loaded'
  | 'failed';

/**
 * Lifecycle of an optional request for the next older page.
 */
export type OlderMessagesLoadStatus = 'idle' | 'loading' | 'failed';

/**
 * Lifecycle of the single in-flight send operation.
 */
export type SendMessageStatus = 'idle' | 'sending' | 'failed';

/**
 * Lifecycle of the single in-flight edit operation.
 */
export type EditMessageStatus = 'idle' | 'editing' | 'failed';

/**
 * Presentation-safe failure information retained by the feature store.
 */
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

  readonly sendMessageStatus: SendMessageStatus;

  readonly editMessageStatus: EditMessageStatus;

  readonly error: ChannelMessagesError | null;

  readonly sendError: ChannelMessagesError | null;

  readonly editError: ChannelMessagesError | null;

  /**
   * Identifies the currently active request generation.
   *
   * Results from older generations are ignored when the user changes channels
   * before a request completes.
   */
  readonly requestGeneration: number;
}

/**
 * Fresh state used at store creation and when the selected channel is cleared.
 */
export const initialChannelMessagesState: ChannelMessagesState = {
  channelId: null,
  messages: [],
  nextCursor: null,
  loadStatus: 'idle',
  olderMessagesStatus: 'idle',
  sendMessageStatus: 'idle',
  editMessageStatus: 'idle',
  error: null,
  sendError: null,
  editError: null,
  requestGeneration: 0,
};
