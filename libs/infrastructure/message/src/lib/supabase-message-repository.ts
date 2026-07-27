import { Effect, Layer, Schema } from 'effect';
import {
  InvalidMessageDataError,
  ListChannelMessagesQuery,
  MessageCursor,
  MessagePage,
  MessageRepositoryError,
  MessageNotFoundError,
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
  mapMessageCommandPostgrestError,
  mapPostgrestError,
  mapThrownRepositoryError,
} from './message-repository-error-mapper';
import { toMessage } from './message-row-mapper';
import {
  SupabaseMessageClientTag,
  type ChatHubSupabaseClient,
} from './supabase-message-client';
import { toCreateMessageArgs } from './message-rpc-mapper';
import type { EditMessageCommand } from '@chat-hub/domain/message';
import type { EditMessageResult } from '@chat-hub/shared/database';
import { toEditMessageArgs } from './message-rpc-mapper';
import type { DeleteMessageCommand } from '@chat-hub/domain/message';
import { toDeleteMessageArgs } from './message-rpc-mapper';
import {
  MessageRepositoryTag,
  type MessageRepository,
} from '@chat-hub/application/message';

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

const decodeMessageVersionId = Schema.decodeUnknown(Schema.UUID);

/**
 * Appends a new immutable version to an existing message.
 *
 * The database returns the newly created message-version UUID. That identifier
 * is validated at the infrastructure boundary but intentionally not exposed by
 * the application repository.
 */
export const editMessage = (
  client: ChatHubSupabaseClient,
  command: EditMessageCommand
): Effect.Effect<void, MessageRepositoryError> =>
  Effect.tryPromise({
    try: async () => client.rpc('edit_message', toEditMessageArgs(command)),

    catch: (cause) => mapThrownRepositoryError('edit', cause),
  }).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error !== null) {
        return Effect.fail(
          mapMessageCommandPostgrestError('edit', command.messageId, error)
        );
      }

      return validateEditResult(data);
    })
  );

const validateEditResult = (
  result: EditMessageResult | null
): Effect.Effect<void, InvalidMessageDataError> =>
  decodeMessageVersionId(result).pipe(
    Effect.mapError((cause) => new InvalidMessageDataError(cause)),
    Effect.asVoid
  );

/**
 * Soft-deletes an active message through the `delete_message` database
 * command.
 *
 * The database retains the stable message identity and immutable version
 * history. Only the current message head transitions to the deleted state.
 */
export const deleteMessage = (
  client: ChatHubSupabaseClient,
  command: DeleteMessageCommand
): Effect.Effect<void, MessageRepositoryError> =>
  Effect.tryPromise({
    try: async () => client.rpc('delete_message', toDeleteMessageArgs(command)),

    catch: (cause) => mapThrownRepositoryError('delete', cause),
  }).pipe(
    Effect.flatMap(({ error }) => {
      if (error !== null) {
        return Effect.fail(
          mapMessageCommandPostgrestError('delete', command.messageId, error)
        );
      }

      return Effect.void;
    })
  );

/**
 * Lists the current message projections for a channel using stable keyset
 * pagination.
 *
 * Results are ordered newest first by `(created_at, message_id)`.
 */
export const listMessagesByChannel = (
  client: ChatHubSupabaseClient,
  query: ListChannelMessagesQuery
): Effect.Effect<MessagePage, MessageRepositoryError> =>
  executeListMessagesQuery(client, query).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error !== null) {
        return Effect.fail(mapPostgrestError('read', error));
      }

      return mapMessagePage(data ?? [], Number(query.limit));
    })
  );

const executeListMessagesQuery = (
  client: ChatHubSupabaseClient,
  query: ListChannelMessagesQuery
) =>
  Effect.tryPromise({
    try: async () => {
      const requestedRowCount = Number(query.limit) + 1;

      let databaseQuery = client
        .from('current_messages')
        .select('*')
        .eq('channel_id', query.channelId)
        .order('created_at', {
          ascending: false,
        })
        .order('message_id', {
          ascending: false,
        })
        .limit(requestedRowCount);

      if (query.before !== undefined) {
        databaseQuery = databaseQuery.or(toBeforeCursorFilter(query.before));
      }

      return databaseQuery;
    },

    catch: (cause) => mapThrownRepositoryError('read', cause),
  });

const toBeforeCursorFilter = (cursor: MessageCursor): string => {
  const createdAt = cursor.createdAt.toISOString();

  return (
    `created_at.lt.${createdAt},` +
    `and(` +
    `created_at.eq.${createdAt},` +
    `message_id.lt.${cursor.messageId}` +
    `)`
  );
};

const mapMessagePage = (
  rows: readonly CurrentMessage[],
  requestedLimit: number
): Effect.Effect<MessagePage, InvalidMessageDataError> =>
  Effect.forEach(rows, mapCurrentMessage).pipe(
    Effect.map((messages) => buildMessagePage(messages, requestedLimit))
  );

const buildMessagePage = (
  mappedMessages: readonly Message[],
  requestedLimit: number
): MessagePage => {
  const hasNextPage = mappedMessages.length > requestedLimit;

  const messages = mappedMessages.slice(0, requestedLimit);

  const lastMessage = messages[messages.length - 1];

  return {
    messages,

    nextCursor:
      hasNextPage && lastMessage !== undefined
        ? {
            createdAt: lastMessage.createdAt,
            messageId: lastMessage.id,
          }
        : null,
  };
};

/**
 * Creates the Supabase-backed implementation of the application message
 * repository.
 *
 * The Supabase client is captured once when the repository is constructed.
 * Repository consumers therefore depend only on MessageRepository and do not
 * need access to the infrastructure client.
 */
export const makeSupabaseMessageRepository = (client: ChatHubSupabaseClient) =>
  ({
    create: (command) => createMessage(client, command),

    edit: (command) => editMessage(client, command),

    delete: (command) => deleteMessage(client, command),

    findById: (messageId) => findMessageById(client, messageId),

    listByChannel: (query) => listMessagesByChannel(client, query),
  }) satisfies MessageRepository;

/**
 * Provides MessageRepository using the Supabase client available in the
 * environment.
 *
 * Requirements:
 *   SupabaseMessageClientTag
 *
 * Provides:
 *   MessageRepositoryTag
 */
export const SupabaseMessageRepositoryLayer = Layer.effect(
  MessageRepositoryTag,
  Effect.gen(function* () {
    const client = yield* SupabaseMessageClientTag;

    return makeSupabaseMessageRepository(client);
  })
);
