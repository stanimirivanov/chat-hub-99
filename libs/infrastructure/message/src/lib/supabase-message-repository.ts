import { Effect, Schema } from 'effect';
import {
  InvalidMessageDataError,
  MessageNotFoundError,
  type MessageRepositoryError,
} from '@chat-hub/application/message';
import {
  CreateMessageCommand,
  MessageIdSchema,
  type Message,
  type MessageId,
} from '@chat-hub/domain/message';
import type {
  CreateMessageResult,
  CurrentMessage,
} from '@chat-hub/shared/database';
import {
  mapPostgrestError,
  mapThrownRepositoryError,
} from './message-repository-error-mapper';
import { toMessage } from './message-row-mapper';
import type { ChatHubSupabaseClient } from './supabase-message-client';
import { toCreateMessageArgs } from './message-rpc-mapper';

/**
 * Finds the current projection of a message and converts it into the
 * validated domain representation.
 */
export const findMessageById = (
  client: ChatHubSupabaseClient,
  messageId: MessageId
): Effect.Effect<Message, MessageRepositoryError> =>
  Effect.tryPromise({
    try: async () =>
      client
        .from('current_messages')
        .select('*')
        .eq('message_id', messageId)
        .maybeSingle(),

    catch: (cause) => mapThrownRepositoryError('read', cause),
  }).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error !== null) {
        return Effect.fail(mapPostgrestError('read', error));
      }

      if (data === null) {
        return Effect.fail(new MessageNotFoundError(messageId));
      }

      return mapCurrentMessage(data);
    })
  );

const mapCurrentMessage = (
  row: CurrentMessage
): Effect.Effect<Message, InvalidMessageDataError> =>
  toMessage(row).pipe(
    Effect.mapError((cause) => new InvalidMessageDataError(cause))
  );

const decodeMessageId = Schema.decodeUnknown(MessageIdSchema);

/**
 * Creates a message through the `create_message` PostgreSQL command and
 * validates the returned identifier before exposing it to the application.
 */
export const createMessage = (
  client: ChatHubSupabaseClient,
  command: CreateMessageCommand
): Effect.Effect<MessageId, MessageRepositoryError> =>
  Effect.tryPromise({
    try: async () => client.rpc('create_message', toCreateMessageArgs(command)),

    catch: (cause) => mapThrownRepositoryError('create', cause),
  }).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error !== null) {
        return Effect.fail(mapPostgrestError('create', error));
      }

      return decodeCreatedMessageId(data);
    })
  );

const decodeCreatedMessageId = (
  result: CreateMessageResult | null
): Effect.Effect<MessageId, InvalidMessageDataError> =>
  decodeMessageId(result).pipe(
    Effect.mapError((cause) => new InvalidMessageDataError(cause))
  );
