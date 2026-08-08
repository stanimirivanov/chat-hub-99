import { Effect, Either, Schema, Stream } from 'effect';
import { WorkspacePresenceUnavailableError } from '@omoikane/application/workspace';
import { ProfileIdSchema, type ProfileId } from '@omoikane/domain/profile';
import type { WorkspaceId } from '@omoikane/domain/workspace';
import { mapWorkspacePresenceState } from '../mapping';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';

const workspacePresenceTopic = (workspaceId: WorkspaceId): string =>
  `workspace-presence:${workspaceId}`;

/**
 * Tracks the authenticated profile on one private workspace Presence topic.
 *
 * Topic access is authorized by active membership in PostgreSQL. The custom
 * Presence key is resolved from the authenticated session rather than supplied
 * by the caller. Synced keys are runtime-validated before they cross the
 * infrastructure boundary. Interrupting the stream removes its channel and
 * therefore its tracked state.
 */
export const makeWorkspacePresenceStream = (
  client: SupabaseWorkspaceClient,
  workspaceId: WorkspaceId
): Stream.Stream<readonly ProfileId[], WorkspacePresenceUnavailableError> =>
  Stream.unwrap(
    Effect.tryPromise({
      try: () => client.auth.getUser(),
      catch: (cause) => new WorkspacePresenceUnavailableError({ cause }),
    }).pipe(
      Effect.flatMap(({ data, error }) => {
        if (error) {
          return Effect.fail(
            new WorkspacePresenceUnavailableError({ cause: error })
          );
        }

        return Schema.decodeUnknown(ProfileIdSchema)(data.user?.id).pipe(
          Effect.mapError(
            (cause) => new WorkspacePresenceUnavailableError({ cause })
          )
        );
      }),
      Effect.map((profileId) =>
        Stream.asyncPush<
          readonly ProfileId[],
          WorkspacePresenceUnavailableError
        >(
          (emit) =>
            Effect.acquireRelease(
              Effect.sync(() => {
                let releasing = false;

                const realtimeChannel = client
                  .channel(workspacePresenceTopic(workspaceId), {
                    config: {
                      private: true,
                      presence: { enabled: true, key: profileId },
                    },
                  })
                  .on('presence', { event: 'sync' }, () => {
                    Either.match(
                      mapWorkspacePresenceState(
                        realtimeChannel.presenceState()
                      ),
                      {
                        onLeft: (failure) => {
                          emit.fail(failure);
                        },
                        onRight: (profileIds) => {
                          emit.single(profileIds);
                        },
                      }
                    );
                  })
                  .subscribe((status, error) => {
                    if (status === 'SUBSCRIBED') {
                      void realtimeChannel
                        .track({ onlineAt: new Date().toISOString() })
                        .then((trackStatus) => {
                          if (!releasing && trackStatus !== 'ok') {
                            emit.fail(
                              new WorkspacePresenceUnavailableError({
                                cause: new Error(
                                  `Presence tracking returned ${trackStatus}.`
                                ),
                              })
                            );
                          }
                        })
                        .catch((cause: unknown) => {
                          if (!releasing) {
                            emit.fail(
                              new WorkspacePresenceUnavailableError({ cause })
                            );
                          }
                        });
                      return;
                    }

                    const failed =
                      status === 'CHANNEL_ERROR' ||
                      status === 'TIMED_OUT' ||
                      (status === 'CLOSED' && !releasing);

                    if (failed) {
                      emit.fail(
                        new WorkspacePresenceUnavailableError({
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
          { bufferSize: 16, strategy: 'sliding' }
        )
      )
    )
  );
