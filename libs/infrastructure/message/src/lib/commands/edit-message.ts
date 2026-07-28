import { Effect, Schema } from 'effect';
import {
  InvalidMessageDataError,
  type MessageRepositoryError,
} from '@chat-hub/application/message';
import type { EditMessageResult } from '@chat-hub/shared/database';
import type { EditMessageCommand } from '@chat-hub/application/message';
import {
  mapMessageCommandPostgrestError,
  mapThrownRepositoryError,
} from '../errors/message-repository-error-mapper';
import { toEditMessageArgs } from '../mapping/message-rpc-mapper';
import type { ChatHubSupabaseClient } from '../supabase-message-client';

const decodeMessageVersionId = Schema.decodeUnknown(Schema.UUID);

/** Appends a new immutable version to an existing message. */
export const editMessage = (
  client: ChatHubSupabaseClient,
  command: EditMessageCommand
): Effect.Effect<void, MessageRepositoryError> =>
  Effect.tryPromise({
    try: async () => client.rpc('edit_message', toEditMessageArgs(command)),
    catch: (cause) => mapThrownRepositoryError('edit', cause),
  }).pipe(
    Effect.flatMap(({ data, error }) =>
      error === null
        ? validateEditResult(data)
        : Effect.fail(
            mapMessageCommandPostgrestError('edit', command.messageId, error)
          )
    )
  );

const validateEditResult = (
  result: EditMessageResult | null
): Effect.Effect<void, InvalidMessageDataError> =>
  decodeMessageVersionId(result).pipe(
    Effect.mapError((cause) => new InvalidMessageDataError({ cause })),
    Effect.asVoid
  );
