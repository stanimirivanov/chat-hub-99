import { Effect } from 'effect';
import type { MessageRepositoryError } from '@omoikane/application/message';
import type { MarkChannelReadArgs } from '@omoikane/shared/database';
import type { MarkChannelReadCommand } from '@omoikane/application/message';
import { mapPostgrestError, mapThrownRepositoryError } from '../errors';
import type { SupabaseMessageClient } from '../supabase-message-client';

/** Advances the authenticated member's database-owned channel read position. */
export const markChannelRead = (
  client: SupabaseMessageClient,
  command: MarkChannelReadCommand
): Effect.Effect<void, MessageRepositoryError> => {
  const args: MarkChannelReadArgs = {
    p_channel_id: command.channelId,
    p_message_id: command.messageId,
  };

  return Effect.tryPromise({
    try: async () => client.rpc('mark_channel_read', args),
    catch: (cause) => mapThrownRepositoryError('read', cause),
  }).pipe(
    Effect.flatMap(({ error }) =>
      error === null
        ? Effect.void
        : Effect.fail(mapPostgrestError('read', error))
    )
  );
};
