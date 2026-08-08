import { Effect } from 'effect';
import {
  InvalidChannelDataError,
  type ChannelRepositoryReadError,
  type ChannelRepositoryRestoreError,
} from '@chat-hub/application/channel';
import type { Channel, ChannelId } from '@chat-hub/domain/channel';
import type { RestoreChannelResult } from '@chat-hub/shared/database';
import { mapChannelRepositoryError, mapChannelRestoreError } from '../errors';
import { mapCurrentChannel, toRestoreChannelArgs } from '../mapping';
import type { SupabaseChannelClient } from '../supabase-channel-client';

/** Executes restoration and validates the returned active channel projection. */
export const restoreChannel = (
  client: SupabaseChannelClient,
  channelId: ChannelId
): Effect.Effect<Channel, ChannelRepositoryRestoreError> =>
  Effect.tryPromise({
    try: () => client.rpc('restore_channel', toRestoreChannelArgs(channelId)),
    catch: mapChannelRepositoryError,
  }).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error !== null) {
        return Effect.fail(mapChannelRestoreError(channelId, error));
      }

      return mapRestoreResult(data, channelId);
    })
  );

const mapRestoreResult = (
  result: RestoreChannelResult | null,
  channelId: ChannelId
): Effect.Effect<Channel, ChannelRepositoryReadError> => {
  if (
    result === null ||
    result.channel_id !== channelId ||
    result.channel_status !== 'active'
  ) {
    return Effect.fail(
      new InvalidChannelDataError({
        cause:
          'Channel restoration returned no matching active channel projection.',
      })
    );
  }

  return mapCurrentChannel(result);
};
