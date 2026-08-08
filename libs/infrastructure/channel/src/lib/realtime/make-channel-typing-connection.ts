import {
  Effect,
  Either,
  PubSub,
  Runtime,
  Schema,
  Stream,
  type Scope,
} from 'effect';
import {
  ChannelTypingUnavailableError,
  type ChannelTypingConnection,
  type ChannelTypingEvent,
} from '@omoikane/application/channel';
import type { ChannelId } from '@omoikane/domain/channel';
import { ProfileIdSchema } from '@omoikane/domain/profile';
import { mapChannelTypingEvent } from '../mapping';
import type { SupabaseChannelClient } from '../supabase-channel-client';

const channelTypingTopic = (channelId: ChannelId): string =>
  `channel-typing:${channelId}`;

/** Opens one scoped private Broadcast connection for advisory typing events. */
export const makeChannelTypingConnection = (
  client: SupabaseChannelClient,
  channelId: ChannelId
): Effect.Effect<
  ChannelTypingConnection,
  ChannelTypingUnavailableError,
  Scope.Scope
> =>
  Effect.gen(function* () {
    const { data, error } = yield* Effect.tryPromise({
      try: () => client.auth.getUser(),
      catch: (cause) => new ChannelTypingUnavailableError({ cause }),
    });
    if (error)
      return yield* new ChannelTypingUnavailableError({ cause: error });
    const profileId = yield* Schema.decodeUnknown(ProfileIdSchema)(
      data.user?.id
    ).pipe(
      Effect.mapError((cause) => new ChannelTypingUnavailableError({ cause }))
    );
    const events =
      yield* PubSub.sliding<
        Either.Either<ChannelTypingEvent, ChannelTypingUnavailableError>
      >(64);
    const runtime = yield* Effect.runtime<never>();

    const realtimeChannel = yield* Effect.acquireRelease(
      Effect.async<
        ReturnType<SupabaseChannelClient['channel']>,
        ChannelTypingUnavailableError
      >((resume) => {
        let ready = false;
        const channel = client
          .channel(channelTypingTopic(channelId), {
            config: { private: true, broadcast: { ack: true, self: false } },
          })
          .on('broadcast', { event: 'typing' }, (payload) => {
            Runtime.runFork(runtime)(
              PubSub.publish(events, mapChannelTypingEvent(payload, channelId))
            );
          })
          .subscribe((status, channelError) => {
            const failed =
              status === 'CHANNEL_ERROR' ||
              status === 'TIMED_OUT' ||
              status === 'CLOSED';
            if (status === 'SUBSCRIBED' && !ready) {
              ready = true;
              resume(Effect.succeed(channel));
            } else if (failed) {
              const failure = new ChannelTypingUnavailableError({
                cause:
                  channelError ??
                  new Error(`Realtime channel changed to ${status}.`),
              });
              if (ready)
                Runtime.runFork(runtime)(
                  PubSub.publish(events, Either.left(failure))
                );
              else
                void client
                  .removeChannel(channel)
                  .finally(() => resume(Effect.fail(failure)));
            }
          });
        return Effect.sync(() => {
          if (!ready) void client.removeChannel(channel);
        });
      }),
      (channel) =>
        Effect.tryPromise({
          try: () => client.removeChannel(channel),
          catch: () => undefined,
        }).pipe(Effect.ignore)
    );

    return {
      events: Stream.fromPubSub(events).pipe(
        Stream.mapEffect((event) =>
          Either.match(event, {
            onLeft: Effect.fail,
            onRight: Effect.succeed,
          })
        )
      ),
      setTyping: (isTyping) =>
        Effect.tryPromise({
          try: () =>
            realtimeChannel.send({
              type: 'broadcast',
              event: 'typing',
              payload: { channelId, profileId, isTyping },
            }),
          catch: (cause) => new ChannelTypingUnavailableError({ cause }),
        }).pipe(
          Effect.flatMap((status) =>
            status === 'ok'
              ? Effect.void
              : Effect.fail(
                  new ChannelTypingUnavailableError({
                    cause: new Error(`Typing broadcast returned ${status}.`),
                  })
                )
          )
        ),
    };
  });
