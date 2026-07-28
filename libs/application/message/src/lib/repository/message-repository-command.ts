import { Schema } from 'effect';
import {
  ChannelIdSchema,
  MessageContentSchema,
  MessageIdSchema,
} from '@chat-hub/domain/message';

export const CreateMessageCommandSchema = Schema.Struct({
  channelId: ChannelIdSchema,
  content: MessageContentSchema,
});

export type CreateMessageCommand = typeof CreateMessageCommandSchema.Type;

export const EditMessageCommandSchema = Schema.Struct({
  messageId: MessageIdSchema,
  content: MessageContentSchema,
});

export type EditMessageCommand = typeof EditMessageCommandSchema.Type;

export const DeleteMessageCommandSchema = Schema.Struct({
  messageId: MessageIdSchema,
});

export type DeleteMessageCommand = typeof DeleteMessageCommandSchema.Type;
