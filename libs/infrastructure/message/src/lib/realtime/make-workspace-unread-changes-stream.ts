import { Effect, Schema, Stream } from 'effect';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { MessageRepositoryUnavailableError } from '@omoikane/application/message';
import { ProfileIdSchema, type ProfileId } from '@omoikane/domain/profile';
import type { WorkspaceId } from '@omoikane/domain/workspace';
import type { SupabaseMessageClient } from '../supabase-message-client';

const workspaceTopic = (workspaceId: WorkspaceId): string =>
  `workspace-unread:${workspaceId}`;

const profileTopic = (profileId: ProfileId): string =>
  `profile-unread:${profileId}`;

/**
 * Observes every provider event that can invalidate one workspace's unread
 * snapshot for the authenticated member.
 *
 * Message/channel lifecycle events arrive on a membership-authorized workspace
 * topic. Cross-tab/device read-position changes arrive on a topic private to
 * the authenticated profile. The stream emits readiness only after both
 * subscriptions are established, closing the query-before-subscribe race.
 */
export const makeWorkspaceUnreadChangesStream = (
  client: SupabaseMessageClient,
  workspaceId: WorkspaceId
): Stream.Stream<void, MessageRepositoryUnavailableError> =>
  Stream.unwrap(
    Effect.tryPromise({
      try: () => client.auth.getUser(),
      catch: (cause) =>
        new MessageRepositoryUnavailableError({ operation: 'read', cause }),
    }).pipe(
      Effect.flatMap(({ data, error }) => {
        if (error) {
          return Effect.fail(
            new MessageRepositoryUnavailableError({
              operation: 'read',
              cause: error,
            })
          );
        }

        return Schema.decodeUnknown(ProfileIdSchema)(data.user?.id).pipe(
          Effect.mapError(
            (cause) =>
              new MessageRepositoryUnavailableError({
                operation: 'read',
                cause,
              })
          )
        );
      }),
      Effect.map((profileId) =>
        Stream.asyncPush<void, MessageRepositoryUnavailableError>(
          (emit) =>
            Effect.acquireRelease(
              Effect.sync(() => {
                let releasing = false;
                const readyTopics = new Set<string>();
                const topics = [
                  workspaceTopic(workspaceId),
                  profileTopic(profileId),
                ];

                const realtimeChannels = topics.map((topic) =>
                  client
                    .channel(topic, { config: { private: true } })
                    .on('broadcast', { event: 'changed' }, () => {
                      emit.single(undefined);
                    })
                    .subscribe((status, error) => {
                      if (status === 'SUBSCRIBED') {
                        readyTopics.add(topic);
                        if (readyTopics.size === topics.length) {
                          emit.single(undefined);
                        }
                        return;
                      }

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
                              new Error(
                                `Realtime channel changed to ${status}.`
                              ),
                          })
                        );
                      }
                    })
                );

                return {
                  realtimeChannels,
                  markReleasing: () => {
                    releasing = true;
                  },
                };
              }),
              ({ realtimeChannels, markReleasing }) => {
                markReleasing();

                return Effect.forEach(
                  realtimeChannels,
                  (channel: RealtimeChannel) =>
                    Effect.tryPromise({
                      try: () => client.removeChannel(channel),
                      catch: () => undefined,
                    }).pipe(Effect.ignore),
                  { concurrency: 'unbounded' }
                ).pipe(Effect.asVoid);
              }
            ),
          { bufferSize: 32, strategy: 'sliding' }
        )
      )
    )
  );
