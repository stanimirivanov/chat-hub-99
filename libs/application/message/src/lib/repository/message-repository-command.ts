import { Schema } from 'effect';
import {
  ChannelIdSchema,
  MessageContentSchema,
  MessageIdSchema,
} from '@chat-hub/domain/message';

const CreateMessageCommandSchema = Schema.Struct({
  channelId: ChannelIdSchema,
  content: MessageContentSchema,
});

const EditMessageCommandSchema = Schema.Struct({
  messageId: MessageIdSchema,
  content: MessageContentSchema,
});

const DeleteMessageCommandSchema = Schema.Struct({
  messageId: MessageIdSchema,
});

export type CreateMessageCommand = typeof CreateMessageCommandSchema.Type;
export type EditMessageCommand = typeof EditMessageCommandSchema.Type;
export type DeleteMessageCommand = typeof DeleteMessageCommandSchema.Type;
