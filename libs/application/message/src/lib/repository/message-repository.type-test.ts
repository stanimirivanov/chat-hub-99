import type { Effect } from 'effect';
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
import { MessageRepositoryError } from './message-repository-error';
import type { MessagePage } from '../pagination';

declare const repository: MessageRepository;
declare const createCommand: CreateMessageCommand;
declare const editCommand: EditMessageCommand;
declare const deleteCommand: DeleteMessageCommand;
declare const messageId: MessageId;
declare const query: ListChannelMessagesQuery;

const createResult: Effect.Effect<MessageId, MessageRepositoryError> =
  repository.create(createCommand);

const editResult: Effect.Effect<void, MessageRepositoryError> =
  repository.edit(editCommand);

const deleteResult: Effect.Effect<void, MessageRepositoryError> =
  repository.delete(deleteCommand);

const findResult: Effect.Effect<Message, MessageRepositoryError> =
  repository.findById(messageId);

const listResult: Effect.Effect<MessagePage, MessageRepositoryError> =
  repository.listByChannel(query);

void createResult;
void editResult;
void deleteResult;
void findResult;
void listResult;
