import { Effect } from 'effect';
import type { MessageRepositoryError } from '@chat-hub/application/message';
import type { DeleteMessageCommand } from '@chat-hub/application/message';
import {
  mapMessageCommandPostgrestError,
  mapThrownRepositoryError,
} from '../errors/message-repository-error-mapper';
import { toDeleteMessageArgs } from '../mapping/message-rpc-mapper';
import type { ChatHubSupabaseClient } from '../supabase-message-client';

/** Soft-deletes a message while retaining its identity and version history. */
export const deleteMessage = (
  client: ChatHubSupabaseClient,
  command: DeleteMessageCommand
): Effect.Effect<void, MessageRepositoryError> =>
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
