import { Effect } from 'effect';

import {
  InvalidMessageDataError,
  MessageNotFoundError,
  type MessageRepositoryError,
} from '@chat-hub/application/message';

import type { Message, MessageId } from '@chat-hub/domain/message';

import type { CurrentMessage } from '@chat-hub/shared/database';

import {
  mapPostgrestError,
  mapThrownRepositoryError,
} from './message-repository-error-mapper';

import { toMessage } from './message-row-mapper';

import type { ChatHubSupabaseClient } from './supabase-message-client';

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
