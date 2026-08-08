import { Schema } from 'effect';
import { ChannelIdSchema } from '@omoikane/domain/channel';
import { ProfileIdSchema } from '@omoikane/domain/profile';
import { MessageContentSchema } from './message-content';
import { MessageIdSchema } from './message-id';

export const ActiveMessageSchema = Schema.Struct({
  id: MessageIdSchema,
  channelId: ChannelIdSchema,
  authorId: ProfileIdSchema,
  status: Schema.Literal('active'),
  content: MessageContentSchema,
  createdAt: Schema.DateFromSelf,
  editedAt: Schema.NullOr(Schema.DateFromSelf),
});

export type ActiveMessage = typeof ActiveMessageSchema.Type;

export const DeletedMessageSchema = Schema.Struct({
  id: MessageIdSchema,
  channelId: ChannelIdSchema,
  authorId: ProfileIdSchema,
  status: Schema.Literal('deleted'),
  content: Schema.Null,
  createdAt: Schema.DateFromSelf,
  editedAt: Schema.NullOr(Schema.DateFromSelf),
  deletedAt: Schema.DateFromSelf,
});

export type DeletedMessage = typeof DeletedMessageSchema.Type;

export const MessageSchema = Schema.Union(
  ActiveMessageSchema,
  DeletedMessageSchema
);

export type Message = typeof MessageSchema.Type;
