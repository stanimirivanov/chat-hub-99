import { Effect } from 'effect';
import type {
  DeleteMessageCommand,
  MessageRepositoryDeleteError,
} from '@omoikane/application/message';
import {
  mapMessageCommandPostgrestError,
  mapThrownRepositoryError,
} from '../errors';
import { toDeleteMessageArgs } from '../mapping';
import type { SupabaseMessageClient } from '../supabase-message-client';

/**
 * Soft-deletes a message while retaining its identity and version history.
 */
export const deleteMessage = (
  client: SupabaseMessageClient,
  command: DeleteMessageCommand
): Effect.Effect<void, MessageRepositoryDeleteError> =>
  Effect.tryPromise({
    try: async () => client.rpc('delete_message', toDeleteMessageArgs(command)),
    catch: (cause) => mapThrownRepositoryError('delete', cause),
  }).pipe(
    Effect.flatMap(({ error }) =>
      error === null
        ? Effect.void
        : Effect.fail(
            mapMessageCommandPostgrestError('delete', command.messageId, error)
          )
    )
  );
