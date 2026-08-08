import { Effect, Layer, Stream } from 'effect';
import {
  ChannelTypingServiceTag,
  type ChannelTypingConnection,
  type ChannelTypingService,
} from '../channel-typing';

export const emptyChannelTypingConnection: ChannelTypingConnection = {
  events: Stream.empty,
  setTyping: () => Effect.void,
};

/** Creates an isolated channel-typing service Layer for use-case tests. */
export const makeChannelTypingServiceLayer = (
  overrides: Partial<ChannelTypingService> = {}
): Layer.Layer<ChannelTypingService> =>
  Layer.succeed(ChannelTypingServiceTag, {
    connect: () => Effect.succeed(emptyChannelTypingConnection),
    ...overrides,
  });
