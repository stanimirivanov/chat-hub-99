import type { Effect } from 'effect';

import type { Message } from '@chat-hub/domain/message';

import type { CreateMessageError } from './create-message-error';
import { createMessage } from './create-message';
import type { MessageRepository } from '../repository';

declare const input: Parameters<typeof createMessage>[0];

const program: Effect.Effect<Message, CreateMessageError, MessageRepository> =
  createMessage(input);

void program;
