import { Effect } from 'effect';
import type { ChannelRepositoryReadError } from '@omoikane/application/channel';
import type { ArchivedChannel } from '@omoikane/domain/channel';
import type { WorkspaceId } from '@omoikane/domain/workspace';
import { mapChannelRepositoryError } from '../errors';
import { mapArchivedChannel } from '../mapping';
import type { SupabaseChannelClient } from '../supabase-channel-client';

/** Lists owner-visible archived channels newest archive first. */
export const listArchivedWorkspaceChannels = (
  client: SupabaseChannelClient,
  workspaceId: WorkspaceId
): Effect.Effect<readonly ArchivedChannel[], ChannelRepositoryReadError> =>
  Effect.tryPromise({
    try: () =>
      client
        .from('current_channels')
        .select('channel_id, workspace_id, name, slug, description, updated_at')
        .eq('workspace_id', workspaceId)
        .eq('channel_status', 'archived')
        .order('updated_at', { ascending: false })
        .order('channel_id', { ascending: true }),
    catch: mapChannelRepositoryError,
  }).pipe(
    Effect.flatMap(
      ({
        data,
        error,
      }): Effect.Effect<
        readonly ArchivedChannel[],
        ChannelRepositoryReadError
      > => {
        if (error !== null) {
          return Effect.fail(mapChannelRepositoryError(error));
        }

        return Effect.forEach(data ?? [], mapArchivedChannel);
      }
    )
  );
