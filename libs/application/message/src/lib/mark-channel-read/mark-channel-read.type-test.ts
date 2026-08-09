import type { Effect } from 'effect';
import { markChannelRead } from './mark-channel-read';
import type { MessageRepository, MessageRepositoryError } from '../repository';

declare const channelId: Parameters<typeof markChannelRead>[0];

const program: Effect.Effect<void, MessageRepositoryError, MessageRepository> =
  markChannelRead(channelId);

void program;
