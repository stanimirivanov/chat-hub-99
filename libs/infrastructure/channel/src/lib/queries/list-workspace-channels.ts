import { Effect } from 'effect';
import type { ChannelRepositoryReadError } from '@omoikane/application/channel';
import type { Channel } from '@omoikane/domain/channel';
import type { WorkspaceId } from '@omoikane/domain/workspace';
import { mapChannelRepositoryError } from '../errors';
import { mapCurrentChannel } from '../mapping';
import type { SupabaseChannelClient } from '../supabase-channel-client';

/**
 * Lists active, RLS-visible channels for one workspace in stable display order.
 *
 * The Supabase result is handled only after the lazy query succeeds. Provider
 * failures are translated and every returned row is decoded before it can
 * become a domain value.
 */
export const listWorkspaceChannels = (
  client: SupabaseChannelClient,
  workspaceId: WorkspaceId
): Effect.Effect<readonly Channel[], ChannelRepositoryReadError> =>
  Effect.tryPromise({
    try: () =>
      client
        .from('current_channels')
        .select('channel_id, workspace_id, name, slug, description')
        .eq('workspace_id', workspaceId)
        .eq('channel_status', 'active')
        .order('name', { ascending: true })
        .order('channel_id', { ascending: true }),
    catch: mapChannelRepositoryError,
  }).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error) {
        return Effect.fail(mapChannelRepositoryError(error));
      }

      return Effect.forEach(data ?? [], mapCurrentChannel);
    })
  );
