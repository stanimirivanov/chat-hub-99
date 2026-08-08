import { Context, Data, type Effect, type Scope, type Stream } from 'effect';
import type { ProfileId } from '@omoikane/domain/profile';
import type { ChannelId } from '@omoikane/domain/channel';

/** Advisory typing change reported by one workspace member. */
export interface ChannelTypingEvent {
  readonly profileId: ProfileId;
  readonly isTyping: boolean;
}

/** Expected failure while connecting, observing, or publishing typing state. */
export class ChannelTypingUnavailableError extends Data.TaggedError(
  'ChannelTypingUnavailableError'
)<{ readonly cause: unknown }> {}

/** Input validation failure before a typing connection is opened. */
export class InvalidChannelTypingInputError extends Data.TaggedError(
  'InvalidChannelTypingInputError'
)<{ readonly field: 'channelId' }> {}

/** One scoped, bidirectional typing connection for a selected channel. */
export interface ChannelTypingConnection {
  readonly events: Stream.Stream<
    ChannelTypingEvent,
    ChannelTypingUnavailableError
  >;
  readonly setTyping: (
    isTyping: boolean
  ) => Effect.Effect<void, ChannelTypingUnavailableError>;
}

/** Outbound port for ephemeral channel typing collaboration. */
export interface ChannelTypingService {
  /**
   * Opens one connection whose lifetime is owned by the surrounding Effect
   * Scope. Closing that Scope must release the provider channel.
   */
  readonly connect: (
    channelId: ChannelId
  ) => Effect.Effect<
    ChannelTypingConnection,
    ChannelTypingUnavailableError,
    Scope.Scope
  >;
}

/** Typed Effect service key for channel typing. */
export const ChannelTypingServiceTag = Context.GenericTag<ChannelTypingService>(
  '@omoikane/application/channel/ChannelTypingService'
);
