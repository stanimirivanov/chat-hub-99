import type { Effect } from 'effect';
import type { MessageRepository } from '../repository/message-repository';
import { MessagePage } from '../pagination/message-page';
import type { ListChannelMessagesError } from './list-channel-messages-error';
import { listChannelMessages } from './list-channel-messages';

declare const input: Parameters<typeof listChannelMessages>[0];

const program: Effect.Effect<
  MessagePage,
  ListChannelMessagesError,
  MessageRepository
> = listChannelMessages(input);

void program;
