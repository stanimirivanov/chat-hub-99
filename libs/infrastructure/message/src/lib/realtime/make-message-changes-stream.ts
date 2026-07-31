import { Effect, Either, Stream } from 'effect';
import {
  MessageRepositoryUnavailableError,
  type MessageChangeNotification,
  type MessageRepositoryError,
} from '@chat-hub/application/message';
import type { ChannelId } from '@chat-hub/domain/channel';
import type { Database } from '@chat-hub/shared/database';
import { mapMessageHeadChange } from '../mapping';
import type { ChatHubSupabaseClient } from '../supabase-message-client';

type MessageHeadRow = Database['public']['Tables']['message_heads']['Row'];

/**
 * Adapts channel-filtered Supabase Postgres Changes into a scoped Effect
 * stream.
 *
 * Starting the stream creates one Realtime channel. Interrupting it marks the
 * channel as intentionally closing and removes it from the shared Supabase
 * client, so channel navigation cannot leak listeners.
 */
export const makeMessageChangesStream = (
  client: ChatHubSupabaseClient,
  channelId: ChannelId
): Stream.Stream<MessageChangeNotification, MessageRepositoryError> =>
  Stream.asyncPush<MessageChangeNotification, MessageRepositoryError>(
    (emit) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          let releasing = false;

          const realtimeChannel = client
            .channel(`message-heads:${channelId}`)
            .on<MessageHeadRow>(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'message_heads',
                filter: `channel_id=eq.${channelId}`,
              },
              (payload) => {
                const mapped = mapMessageHeadChange(payload, channelId);

                Either.match(mapped, {
                  onLeft: (error) => {
                    emit.fail(error);
                  },
                  onRight: (notification) => {
                    emit.single(notification);
                  },
                });
              }
            )
            .subscribe((status, error) => {
              const failed =
                status === 'CHANNEL_ERROR' ||
                status === 'TIMED_OUT' ||
                (status === 'CLOSED' && !releasing);

              if (failed) {
                emit.fail(
                  new MessageRepositoryUnavailableError({
                    operation: 'read',
                    cause:
                      error ??
                      new Error(`Realtime channel changed to ${status}.`),
                  })
                );
              }
            });

          return {
            realtimeChannel,
            markReleasing: () => {
              releasing = true;
            },
          };
        }),
        ({ realtimeChannel, markReleasing }) => {
          markReleasing();

          return Effect.tryPromise({
            try: () => client.removeChannel(realtimeChannel),
            catch: () => undefined,
          }).pipe(Effect.ignore);
        }
      ),
    {
      bufferSize: 64,
      strategy: 'sliding',
    }
  );
