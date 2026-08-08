import { Effect } from 'effect';

import type {
  InvalidMessageDataError,
  ListChannelMessagesQuery,
  MessageCursor,
  MessagePage,
  MessageRepositoryError,
} from '@omoikane/application/message';
import type { Message } from '@omoikane/domain/message';
import type { CurrentMessage } from '@omoikane/shared/database';
import {
  mapPostgrestError,
  mapThrownRepositoryError,
} from '../errors/message-repository-error-mapper';
import type { SupabaseMessageClient } from '../supabase-message-client';
import { mapCurrentMessage } from '../mapping/map-current-message';

/**
 * Lists current messages using stable `(created_at, message_id)` keyset pagination.
 */
export const listMessagesByChannel = (
  client: SupabaseMessageClient,
  query: ListChannelMessagesQuery
): Effect.Effect<MessagePage, MessageRepositoryError> =>
  executeListMessagesQuery(client, query).pipe(
    Effect.flatMap(({ data, error }) =>
      error === null
        ? mapMessagePage(data ?? [], Number(query.limit))
        : Effect.fail(mapPostgrestError('read', error))
    )
  );

const executeListMessagesQuery = (
  client: SupabaseMessageClient,
  query: ListChannelMessagesQuery
) =>
  Effect.tryPromise({
    try: async () => {
      let databaseQuery = client
        .from('current_messages')
        .select('*')
        .eq('channel_id', query.channelId)
        .order('created_at', { ascending: false })
        .order('message_id', { ascending: false })
        .limit(Number(query.limit) + 1);

      if (query.before !== undefined) {
        databaseQuery = databaseQuery.or(toBeforeCursorFilter(query.before));
      }

      return databaseQuery;
    },
    catch: (cause) => mapThrownRepositoryError('read', cause),
  });

/**
 *  Builds the PostgREST filter for rows strictly before a compound cursor.
 */
export const toBeforeCursorFilter = (cursor: MessageCursor): string => {
  const createdAt = cursor.createdAt.toISOString();
  return `created_at.lt.${createdAt},and(created_at.eq.${createdAt},message_id.lt.${cursor.messageId})`;
};

const mapMessagePage = (
  rows: readonly CurrentMessage[],
  requestedLimit: number
): Effect.Effect<MessagePage, InvalidMessageDataError> =>
  Effect.forEach(rows, mapCurrentMessage).pipe(
    Effect.map((messages) => buildMessagePage(messages, requestedLimit))
  );

/** Removes the look-ahead row and derives the cursor for the next page. */
export const buildMessagePage = (
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
        ? { createdAt: lastMessage.createdAt, messageId: lastMessage.id }
        : null,
  };
};
