import { Context, type Effect } from 'effect';
import type {
  CreateMessageCommand,
  DeleteMessageCommand,
  EditMessageCommand,
  Message,
  MessageId,
} from '@chat-hub/domain/message';
import type { ListChannelMessagesQuery, MessagePage } from './message-query';
import type { MessageRepositoryError } from './message-repository-error';

export interface MessageRepository {
  readonly create: (
    command: CreateMessageCommand
  ) => Effect.Effect<MessageId, MessageRepositoryError>;

  readonly edit: (
    command: EditMessageCommand
  ) => Effect.Effect<void, MessageRepositoryError>;

  readonly delete: (
    command: DeleteMessageCommand
  ) => Effect.Effect<void, MessageRepositoryError>;

  readonly findById: (
    messageId: MessageId
  ) => Effect.Effect<Message, MessageRepositoryError>;

  readonly listByChannel: (
    query: ListChannelMessagesQuery
  ) => Effect.Effect<MessagePage, MessageRepositoryError>;
}

export const MessageRepositoryTag = Context.GenericTag<MessageRepository>(
  '@chat-hub/application/message/MessageRepository'
);
