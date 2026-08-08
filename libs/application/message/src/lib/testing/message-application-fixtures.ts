import { Schema } from 'effect';
import { ChannelIdSchema } from '@omoikane/domain/channel';
import { ProfileIdSchema } from '@omoikane/domain/profile';

import {
  MessageContentSchema,
  MessageIdSchema,
  type Message,
} from '@omoikane/domain/message';

export const channelId = Schema.decodeUnknownSync(ChannelIdSchema)(
  '00000000-0000-4000-8000-000000000001'
);

export const messageId = Schema.decodeUnknownSync(MessageIdSchema)(
  '00000000-0000-4000-8000-000000000002'
);

export const authorId = Schema.decodeUnknownSync(ProfileIdSchema)(
  '00000000-0000-4000-8000-000000000003'
);

export const messageContent =
  Schema.decodeUnknownSync(MessageContentSchema)('Hello');

export const activeMessage: Message = {
  id: messageId,
  channelId,
  authorId,
  status: 'active',
  content: messageContent,
  createdAt: new Date('2026-07-27T08:00:00.000Z'),
  editedAt: null,
};

export const deletedMessage: Message = {
  id: messageId,
  channelId,
  authorId,
  status: 'deleted',
  content: null,
  createdAt: new Date('2026-07-27T08:00:00.000Z'),
  editedAt: null,
  deletedAt: new Date('2026-07-29T08:00:00.000Z'),
};
