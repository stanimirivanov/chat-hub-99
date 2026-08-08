import { Effect, Schema, Stream } from 'effect';
import { ProfileIdSchema, type ProfileId } from '@omoikane/domain/profile';
import { WorkspaceRepositoryUnavailableError } from '@omoikane/application/workspace';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';

const workspaceAccessTopic = (userId: ProfileId): string =>
  `workspace-access:${userId}`;

/**
 * Adapts one private Supabase Broadcast topic into workspace-access
 * invalidations for the authenticated user.
 *
 * The stream resolves and validates provider identity before joining the
 * corresponding private topic. It emits once after subscription readiness so
 * the application can establish an initial authoritative snapshot without a
 * query-before-subscribe race. Interrupting the stream removes the Realtime
 * channel from the shared client.
 */
export const makeWorkspaceAccessChangesStream = (
  client: SupabaseWorkspaceClient
): Stream.Stream<void, WorkspaceRepositoryUnavailableError> =>
  Stream.unwrap(
    Effect.tryPromise({
      try: () => client.auth.getUser(),
      catch: (cause) => new WorkspaceRepositoryUnavailableError({ cause }),
    }).pipe(
      Effect.flatMap(({ data, error }) => {
        if (error) {
          return Effect.fail(
            new WorkspaceRepositoryUnavailableError({ cause: error })
          );
        }

        return Schema.decodeUnknown(ProfileIdSchema)(data.user?.id).pipe(
          Effect.mapError(
            (cause) => new WorkspaceRepositoryUnavailableError({ cause })
          )
        );
      }),
      Effect.map((userId) =>
        Stream.asyncPush<void, WorkspaceRepositoryUnavailableError>(
          (emit) =>
            Effect.acquireRelease(
              Effect.sync(() => {
                let releasing = false;
                let ready = false;

                const realtimeChannel = client
                  .channel(workspaceAccessTopic(userId), {
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
                        new WorkspaceRepositoryUnavailableError({
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
        )
      )
    )
  );
