import type { Effect } from 'effect';

import { listChannelMessages } from './list-channel-messages';
import type { ListChannelMessagesError } from './list-channel-messages-error';
import type { MessageRepository } from '../repository';
import type { MessagePage } from '../pagination';

declare const input: Parameters<typeof listChannelMessages>[0];

const program: Effect.Effect<
  MessagePage,
  ListChannelMessagesError,
  MessageRepository
> = listChannelMessages(input);

void program;
