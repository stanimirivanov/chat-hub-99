import { Effect, Schema, type Scope } from 'effect';
import { ChannelIdSchema } from '@omoikane/domain/channel';
import {
  ChannelTypingServiceTag,
  InvalidChannelTypingInputError,
  type ChannelTypingConnection,
  type ChannelTypingService,
  type ChannelTypingUnavailableError,
} from './channel-typing';

/** Untrusted input accepted when opening a typing connection. */
export interface ConnectChannelTypingInput {
  readonly channelId?: unknown;
}

/**
 * Opens a scoped typing connection for one runtime-validated channel.
 *
 * The Effect requires both the provider-independent typing service and a Scope
 * that owns connection cleanup.
 */
export const connectChannelTyping = (
  input?: ConnectChannelTypingInput | null
): Effect.Effect<
  ChannelTypingConnection,
  InvalidChannelTypingInputError | ChannelTypingUnavailableError,
  ChannelTypingService | Scope.Scope
> =>
  Effect.gen(function* () {
    const channelId = yield* Schema.decodeUnknown(ChannelIdSchema)(
      input?.channelId
    ).pipe(
      Effect.mapError(
        () => new InvalidChannelTypingInputError({ field: 'channelId' })
      )
    );
    const service = yield* ChannelTypingServiceTag;

    return yield* service.connect(channelId);
  });
