import { Schema } from 'effect';
import {
  ChannelIdSchema,
  MessageContentSchema,
  MessageIdSchema,
} from '@chat-hub/domain/message';
import type {
  CreateMessageCommand,
  DeleteMessageCommand,
  EditMessageCommand,
} from '@chat-hub/application/message';

export const createMessageCommand = {
  channelId: Schema.decodeUnknownSync(ChannelIdSchema)(
    '00000000-0000-4000-8000-000000000001'
  ),
  content: Schema.decodeUnknownSync(MessageContentSchema)('Hello'),
} satisfies CreateMessageCommand;

export const editMessageCommand = {
  messageId: Schema.decodeUnknownSync(MessageIdSchema)(
    '00000000-0000-4000-8000-000000000002'
  ),
  content: Schema.decodeUnknownSync(MessageContentSchema)('Edited message'),
} satisfies EditMessageCommand;

export const deleteMessageCommand = {
  messageId: Schema.decodeUnknownSync(MessageIdSchema)(
    '00000000-0000-4000-8000-000000000002'
  ),
} satisfies DeleteMessageCommand;
