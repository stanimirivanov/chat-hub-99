import type { Effect } from 'effect';
import type { Message } from '@chat-hub/domain/message';
import { deleteMessage } from './delete-message';
import type { DeleteMessageError } from './delete-message-error';
import type { MessageRepository } from '../repository';

declare const input: Parameters<typeof deleteMessage>[0];

const program: Effect.Effect<Message, DeleteMessageError, MessageRepository> =
  deleteMessage(input);

void program;
