import { Effect, Stream } from 'effect';
import { ChannelRepositoryUnavailableError } from '@chat-hub/application/channel';
import type { WorkspaceId } from '@chat-hub/domain/workspace';
import type { SupabaseChannelClient } from '../supabase-channel-client';

const workspaceChannelTopic = (workspaceId: WorkspaceId): string =>
  `workspace-channels:${workspaceId}`;

/**
 * Adapts one private workspace Broadcast topic into channel invalidations.
 *
 * The database authorizes topic receipt from the authenticated user's active
 * workspace membership. A readiness emission closes the query-before-listen
 * race; subsequent payload-minimal broadcasts invalidate the same ordinary
 * RLS-protected channel query. Interrupting the stream removes its channel.
 */
export const makeWorkspaceChannelChangesStream = (
  client: SupabaseChannelClient,
  workspaceId: WorkspaceId
): Stream.Stream<void, ChannelRepositoryUnavailableError> =>
  Stream.asyncPush<void, ChannelRepositoryUnavailableError>(
    (emit) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          let releasing = false;
          let ready = false;

          const realtimeChannel = client
            .channel(workspaceChannelTopic(workspaceId), {
              config: { private: true },
            })
            .on('broadcast', { event: 'changed' }, () => {
              emit.single(undefined);
            })
            .subscribe((status, error) => {
              if (status === 'SUBSCRIBED' && !ready) {
                ready = true;
                emit.single(undefined);
                return;
              }

              const failed =
                status === 'CHANNEL_ERROR' ||
                status === 'TIMED_OUT' ||
                (status === 'CLOSED' && !releasing);

              if (failed) {
                emit.fail(
                  new ChannelRepositoryUnavailableError({
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
      bufferSize: 16,
      strategy: 'sliding',
    }
  );
