import { Effect, Schema } from 'effect';
import {
  InvalidChannelDataError,
  type ChannelRepositoryUpdateError,
  type UpdateChannelCommand,
} from '@chat-hub/application/channel';
import type { UpdateChannelResult } from '@chat-hub/shared/database';
import { mapChannelRepositoryError, mapChannelUpdateError } from '../errors';
import { toUpdateChannelArgs } from '../mapping';
import type { SupabaseChannelClient } from '../supabase-channel-client';

const decodeVersionId = Schema.decodeUnknown(Schema.UUID);

/**
 * Executes the transactional channel-update RPC and validates its immutable
 * version identity before acknowledging success.
 */
export const updateChannel = (
  client: SupabaseChannelClient,
  command: UpdateChannelCommand
): Effect.Effect<void, ChannelRepositoryUpdateError> =>
  Effect.tryPromise({
    try: () => client.rpc('update_channel', toUpdateChannelArgs(command)),
    catch: mapChannelRepositoryError,
  }).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error !== null) {
        return Effect.fail(mapChannelUpdateError(command, error));
      }

      return validateUpdateResult(data);
    })
  );

const validateUpdateResult = (
  result: UpdateChannelResult | null
): Effect.Effect<void, InvalidChannelDataError> =>
  decodeVersionId(result).pipe(
    Effect.asVoid,
    Effect.mapError((cause) => new InvalidChannelDataError({ cause }))
  );
