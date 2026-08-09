import type { Effect } from 'effect';
import { listWorkspaceChannelUnreadCounts } from './list-workspace-channel-unread-counts';
import type {
  ChannelUnreadCount,
  MessageRepository,
  MessageRepositoryError,
} from '../repository';

declare const workspaceId: Parameters<
  typeof listWorkspaceChannelUnreadCounts
>[0];

const program: Effect.Effect<
  readonly ChannelUnreadCount[],
  MessageRepositoryError,
  MessageRepository
> = listWorkspaceChannelUnreadCounts(workspaceId);

void program;
