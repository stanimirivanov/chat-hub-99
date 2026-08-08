import { Effect, Schema } from 'effect';
import {
  CreateMessageCommand,
  InvalidMessageDataError,
  type MessageRepositoryCreateError,
} from '@omoikane/application/message';
import { MessageIdSchema, type MessageId } from '@omoikane/domain/message';
import type { CreateMessageResult } from '@omoikane/shared/database';
import {
  mapCreateMessagePostgrestError,
  mapThrownRepositoryError,
} from '../errors';
import { toCreateMessageArgs } from '../mapping';
import type { SupabaseMessageClient } from '../supabase-message-client';

const decodeMessageId = Schema.decodeUnknown(MessageIdSchema);

/**
 * Executes the immutable `create_message` database command.
 */
export const createMessage = (
  client: SupabaseMessageClient,
  command: CreateMessageCommand
): Effect.Effect<MessageId, MessageRepositoryCreateError> =>
  Effect.tryPromise({
    try: async () => client.rpc('create_message', toCreateMessageArgs(command)),
    catch: (cause) => mapThrownRepositoryError('create', cause),
  }).pipe(
    Effect.flatMap(({ data, error }) =>
      error === null
        ? decodeCreatedMessageId(data)
        : Effect.fail(mapCreateMessagePostgrestError(command.channelId, error))
    )
  );

const decodeCreatedMessageId = (
  result: CreateMessageResult | null
): Effect.Effect<MessageId, InvalidMessageDataError> =>
  decodeMessageId(result).pipe(
    Effect.mapError((cause) => new InvalidMessageDataError({ cause }))
  );
