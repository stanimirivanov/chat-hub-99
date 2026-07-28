import { Effect, Schema } from 'effect';
import {
  CreateMessageCommand,
  InvalidMessageDataError,
  type MessageRepositoryError,
} from '@chat-hub/application/message';
import { MessageIdSchema, type MessageId } from '@chat-hub/domain/message';
import type { CreateMessageResult } from '@chat-hub/shared/database';
import {
  mapPostgrestError,
  mapThrownRepositoryError,
} from '../errors/message-repository-error-mapper';
import { toCreateMessageArgs } from '../mapping/message-rpc-mapper';
import type { ChatHubSupabaseClient } from '../supabase-message-client';

const decodeMessageId = Schema.decodeUnknown(MessageIdSchema);

/** Executes the immutable `create_message` database command. */
export const createMessage = (
  client: ChatHubSupabaseClient,
  command: CreateMessageCommand
): Effect.Effect<MessageId, MessageRepositoryError> =>
  Effect.tryPromise({
    try: async () => client.rpc('create_message', toCreateMessageArgs(command)),
    catch: (cause) => mapThrownRepositoryError('create', cause),
  }).pipe(
    Effect.flatMap(({ data, error }) =>
      error === null
        ? decodeCreatedMessageId(data)
        : Effect.fail(mapPostgrestError('create', error))
    )
  );

const decodeCreatedMessageId = (
  result: CreateMessageResult | null
): Effect.Effect<MessageId, InvalidMessageDataError> =>
  decodeMessageId(result).pipe(
    Effect.mapError((cause) => new InvalidMessageDataError(cause))
  );
