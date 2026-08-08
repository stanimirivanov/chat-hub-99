import { Effect } from 'effect';
import {
  MessageNotFoundError,
  type MessageRepositoryError,
} from '@omoikane/application/message';
import type { Message, MessageId } from '@omoikane/domain/message';
import {
  mapPostgrestError,
  mapThrownRepositoryError,
} from '../errors/message-repository-error-mapper';
import type { SupabaseMessageClient } from '../supabase-message-client';
import { mapCurrentMessage } from '../mapping/map-current-message';

/**
 * Reads one current message projection by its stable identity.
 */
export const findMessageById = (
  client: SupabaseMessageClient,
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
        return Effect.fail(
          new MessageNotFoundError({
            messageId,
          })
        );
      }

      return mapCurrentMessage(data);
    })
  );
