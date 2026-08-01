import type { Effect, Stream } from 'effect';
import type { ChannelId } from '@chat-hub/domain/channel';
import type { Message, MessageId } from '@chat-hub/domain/message';

import {
  CreateMessageCommand,
  DeleteMessageCommand,
  EditMessageCommand,
} from './message-repository-command';
import {
  ListChannelMessagesQuery,
  MessageRepository,
} from './message-repository';
import {
  MessageRepositoryCreateError,
  MessageRepositoryDeleteError,
  MessageRepositoryEditError,
  MessageRepositoryError,
} from './message-repository-error';
import type { MessageChangeNotification } from './message-change-notification';
import type { MessagePage } from '../pagination';

declare const repository: MessageRepository;
declare const createCommand: CreateMessageCommand;
declare const editCommand: EditMessageCommand;
declare const deleteCommand: DeleteMessageCommand;
declare const messageId: MessageId;
declare const query: ListChannelMessagesQuery;
declare const channelId: ChannelId;

const createResult: Effect.Effect<MessageId, MessageRepositoryCreateError> =
  repository.create(createCommand);

const editResult: Effect.Effect<void, MessageRepositoryEditError> =
  repository.edit(editCommand);

const deleteResult: Effect.Effect<void, MessageRepositoryDeleteError> =
  repository.delete(deleteCommand);

const findResult: Effect.Effect<Message, MessageRepositoryError> =
  repository.findById(messageId);

const listResult: Effect.Effect<MessagePage, MessageRepositoryError> =
  repository.listByChannel(query);

const changesResult: Stream.Stream<
  MessageChangeNotification,
  MessageRepositoryError
> = repository.changesByChannel(channelId);

void createResult;
void editResult;
void deleteResult;
void findResult;
void listResult;
void changesResult;
