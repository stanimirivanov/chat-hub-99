import type { Effect } from 'effect';
import type { Message } from '@omoikane/domain/message';
import { editMessage } from './edit-message';
import type { EditMessageError } from './edit-message-error';
import type { MessageRepository } from '../repository';

declare const input: Parameters<typeof editMessage>[0];

const program: Effect.Effect<Message, EditMessageError, MessageRepository> =
  editMessage(input);

void program;
