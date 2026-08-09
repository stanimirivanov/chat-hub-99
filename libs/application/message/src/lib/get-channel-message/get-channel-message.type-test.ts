import type { Effect } from 'effect';
import type { Message } from '@omoikane/domain/message';
import { getChannelMessage } from './get-channel-message';
import type { MessageRepository, MessageRepositoryError } from '../repository';

declare const input: Parameters<typeof getChannelMessage>[0];

const program: Effect.Effect<
  Message,
  MessageRepositoryError,
  MessageRepository
> = getChannelMessage(input);

void program;
