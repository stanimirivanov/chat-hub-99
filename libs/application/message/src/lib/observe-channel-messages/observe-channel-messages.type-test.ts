import type { Stream } from 'effect';
import type { MessageRepository } from '../repository';
import type { MessageChange } from './message-change';
import type { ObserveChannelMessagesError } from './observe-channel-messages-error';
import { observeChannelMessages } from './observe-channel-messages';

const result: Stream.Stream<
  MessageChange,
  ObserveChannelMessagesError,
  MessageRepository
> = observeChannelMessages({
  channelId: '00000000-0000-4000-8000-000000000001',
});

void result;
