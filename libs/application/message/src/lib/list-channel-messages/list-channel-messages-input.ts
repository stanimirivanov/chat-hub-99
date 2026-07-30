import type { ChannelId } from '@chat-hub/domain/channel';
import type { MessageId } from '@chat-hub/domain/message';

/**
 * Pagination cursor accepted by the list-channel-messages use case.
 */
export interface ListChannelMessagesCursorInput {
  readonly createdAt: Date;
  readonly messageId: MessageId;
}

/**
 * Input accepted by the list-channel-messages use case.
 */
export interface ListChannelMessagesInput {
  readonly channelId: ChannelId;
  readonly limit?: number;
  readonly before?: ListChannelMessagesCursorInput;
}
