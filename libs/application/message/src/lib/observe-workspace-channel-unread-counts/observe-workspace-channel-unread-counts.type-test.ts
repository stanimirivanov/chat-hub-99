import type { Stream } from 'effect';
import type { MessageRepository } from '../repository';
import type { ChannelUnreadCount } from '../repository';
import {
  observeWorkspaceChannelUnreadCounts,
  type ObserveWorkspaceChannelUnreadCountsError,
} from './index';

const result: Stream.Stream<
  readonly ChannelUnreadCount[],
  ObserveWorkspaceChannelUnreadCountsError,
  MessageRepository
> = observeWorkspaceChannelUnreadCounts({
  workspaceId: '00000000-0000-4000-8000-000000000001',
});

void result;
