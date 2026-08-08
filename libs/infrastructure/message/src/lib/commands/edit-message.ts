import { Effect, Schema } from 'effect';
import {
  InvalidMessageDataError,
  type MessageRepositoryEditError,
} from '@omoikane/application/message';
import type { EditMessageResult } from '@omoikane/shared/database';
import type { EditMessageCommand } from '@omoikane/application/message';
import {
  mapEditMessagePostgrestError,
  mapThrownRepositoryError,
} from '../errors';
import { toEditMessageArgs } from '../mapping';
import type { SupabaseMessageClient } from '../supabase-message-client';

const decodeMessageVersionId = Schema.decodeUnknown(Schema.UUID);

/** Appends a new immutable version to an existing message. */
export const editMessage = (
  client: SupabaseMessageClient,
  command: EditMessageCommand
): Effect.Effect<void, MessageRepositoryEditError> =>
  Effect.tryPromise({
    try: async () => client.rpc('edit_message', toEditMessageArgs(command)),
    catch: (cause) => mapThrownRepositoryError('edit', cause),
  }).pipe(
    Effect.flatMap(({ data, error }) =>
      error === null
        ? validateEditResult(data)
        : Effect.fail(mapEditMessagePostgrestError(command.messageId, error))
    )
  );

const validateEditResult = (
  result: EditMessageResult | null
): Effect.Effect<void, InvalidMessageDataError> =>
  decodeMessageVersionId(result).pipe(
    Effect.mapError((cause) => new InvalidMessageDataError({ cause })),
    Effect.asVoid
  );
