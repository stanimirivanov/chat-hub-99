import type { MessageContent, MessageId } from '@chat-hub/domain/message';
import type { ChannelId } from '@chat-hub/domain/channel';

/**
 * Validated command passed to the repository when creating a message.
 */
export interface CreateMessageCommand {
  readonly channelId: ChannelId;
  readonly content: MessageContent;
}

/**
 * Validated command passed to the repository when editing a message.
 */
export interface EditMessageCommand {
  readonly messageId: MessageId;
  readonly content: MessageContent;
}

/**
 * Command passed to the repository when soft-deleting a message.
 */
export interface DeleteMessageCommand {
  readonly messageId: MessageId;
}
