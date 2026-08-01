import { Effect } from 'effect';
import type { ChannelRepositoryArchiveError } from '@chat-hub/application/channel';
import type { ChannelId } from '@chat-hub/domain/channel';
import { mapChannelArchiveError, mapChannelRepositoryError } from '../errors';
import { toArchiveChannelArgs } from '../mapping';
import type { SupabaseChannelClient } from '../supabase-channel-client';

/**
 * Executes the transactional archive RPC and acknowledges its `void` success
 * without representing an archived channel as an active domain value.
 */
export const archiveChannel = (
  client: SupabaseChannelClient,
  channelId: ChannelId
): Effect.Effect<void, ChannelRepositoryArchiveError> =>
  Effect.tryPromise({
    try: () => client.rpc('archive_channel', toArchiveChannelArgs(channelId)),
    catch: mapChannelRepositoryError,
  }).pipe(
    Effect.flatMap(({ error }) =>
      error === null
        ? Effect.succeed(undefined)
        : Effect.fail(mapChannelArchiveError(channelId, error))
    )
  );
