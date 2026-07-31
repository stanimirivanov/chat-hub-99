import { Effect, Schema } from 'effect';
import {
  InvalidChannelDataError,
  type ChannelRepositoryCreateError,
  type CreateChannelCommand,
} from '@chat-hub/application/channel';
import { ChannelIdSchema, type ChannelId } from '@chat-hub/domain/channel';
import type { CreateChannelResult } from '@chat-hub/shared/database';
import { mapChannelCreateError, mapChannelRepositoryError } from '../errors';
import { toCreateChannelArgs } from '../mapping';
import type { SupabaseChannelClient } from '../supabase-channel-client';

const decodeChannelId = Schema.decodeUnknown(ChannelIdSchema);

/**
 * Executes the transactional channel-creation RPC and validates its returned
 * identity before it crosses the adapter boundary.
 */
export const createChannel = (
  client: SupabaseChannelClient,
  command: CreateChannelCommand
): Effect.Effect<ChannelId, ChannelRepositoryCreateError> =>
  Effect.tryPromise({
    try: () => client.rpc('create_channel', toCreateChannelArgs(command)),
    catch: mapChannelRepositoryError,
  }).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error !== null) {
        return Effect.fail(mapChannelCreateError(command, error));
      }

      return mapCreateResult(data);
    })
  );

const mapCreateResult = (
  result: CreateChannelResult | null
): Effect.Effect<ChannelId, InvalidChannelDataError> =>
  decodeChannelId(result).pipe(
    Effect.mapError((cause) => new InvalidChannelDataError({ cause }))
  );
