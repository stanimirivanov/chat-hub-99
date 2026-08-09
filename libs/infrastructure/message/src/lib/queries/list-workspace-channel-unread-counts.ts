import { Effect } from 'effect';
import type {
  ChannelUnreadCount,
  MessageRepositoryError,
} from '@omoikane/application/message';
import type { WorkspaceId } from '@omoikane/domain/workspace';
import type { ListWorkspaceChannelUnreadCountsArgs } from '@omoikane/shared/database';
import { mapPostgrestError, mapThrownRepositoryError } from '../errors';
import { mapChannelUnreadCount } from '../mapping';
import type { SupabaseMessageClient } from '../supabase-message-client';

/** Loads the database-authoritative unread snapshot for active channels. */
export const listWorkspaceChannelUnreadCounts = (
  client: SupabaseMessageClient,
  workspaceId: WorkspaceId
): Effect.Effect<readonly ChannelUnreadCount[], MessageRepositoryError> => {
  const args: ListWorkspaceChannelUnreadCountsArgs = {
    p_workspace_id: workspaceId,
  };

  return Effect.tryPromise({
    try: async () => client.rpc('list_workspace_channel_unread_counts', args),
    catch: (cause) => mapThrownRepositoryError('read', cause),
  }).pipe(
    Effect.flatMap(({ data, error }) =>
      error === null
        ? Effect.forEach(data ?? [], mapChannelUnreadCount)
        : Effect.fail(mapPostgrestError('read', error))
    )
  );
};
