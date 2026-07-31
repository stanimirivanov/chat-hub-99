import type { MessagePage } from '@chat-hub/application/message';
import type { ChannelId } from '@chat-hub/domain/channel';
import type { Profile } from '@chat-hub/domain/profile';

/**
 * Lifecycle of the newest-page request for the selected channel.
 */
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
 * Lifecycle of the single in-flight delete operation.
 */
export type DeleteMessageStatus = 'idle' | 'deleting' | 'failed';

/**
 * Lifecycle of the selected channel's long-lived realtime subscription.
 */
export type ChannelMessagesRealtimeStatus = 'idle' | 'observing' | 'failed';

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

  /**
   * RLS-visible display profiles for authors in the loaded message pages.
   *
   * A profile may be absent when it is hidden, no longer active, or its
   * best-effort enrichment request failed.
   */
  readonly authorProfiles: readonly Profile[];

  readonly nextCursor: MessagePage['nextCursor'];

  readonly loadStatus: ChannelMessagesLoadStatus;

  readonly olderMessagesStatus: OlderMessagesLoadStatus;

  readonly sendMessageStatus: SendMessageStatus;

  readonly editMessageStatus: EditMessageStatus;

  readonly deleteMessageStatus: DeleteMessageStatus;

  readonly realtimeStatus: ChannelMessagesRealtimeStatus;

  readonly error: ChannelMessagesError | null;

  readonly sendError: ChannelMessagesError | null;

  readonly editError: ChannelMessagesError | null;

  readonly deleteError: ChannelMessagesError | null;

  readonly realtimeError: ChannelMessagesError | null;

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
  authorProfiles: [],
  nextCursor: null,
  loadStatus: 'idle',
  olderMessagesStatus: 'idle',
  sendMessageStatus: 'idle',
  editMessageStatus: 'idle',
  deleteMessageStatus: 'idle',
  realtimeStatus: 'idle',
  error: null,
  sendError: null,
  editError: null,
  deleteError: null,
  realtimeError: null,
  requestGeneration: 0,
};
