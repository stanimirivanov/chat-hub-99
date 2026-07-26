import { Schema } from 'effect';
import type { ChannelId, Message, MessageId } from '@chat-hub/domain/message';

export const MessagePageSizeSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.between(1, 100),
  Schema.brand('MessagePageSize')
);

export type MessagePageSize = typeof MessagePageSizeSchema.Type;

export interface MessageCursor {
  readonly createdAt: Date;
  readonly messageId: MessageId;
}

export interface ListChannelMessagesQuery {
  readonly channelId: ChannelId;
  readonly limit: MessagePageSize;
  readonly before?: MessageCursor;
}

export interface MessagePage {
  readonly messages: readonly Message[];
  readonly nextCursor: MessageCursor | null;
}
