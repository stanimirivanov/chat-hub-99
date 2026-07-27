import type { Effect } from 'effect';

import type { MessagePage, MessageRepository } from '../message-repository';

import type { ListChannelMessagesError } from './list-channel-messages-error';

import { listChannelMessages } from './list-channel-messages';

declare const input: Parameters<typeof listChannelMessages>[0];

const program: Effect.Effect<
  MessagePage,
  ListChannelMessagesError,
  MessageRepository
> = listChannelMessages(input);

void program;
