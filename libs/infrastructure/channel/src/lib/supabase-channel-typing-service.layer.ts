import { Effect, Layer } from 'effect';
import { ChannelTypingServiceTag } from '@omoikane/application/channel';
import { makeChannelTypingConnection } from './realtime';
import { SupabaseChannelClientTag } from './supabase-channel-client';

/** Supplies scoped channel typing connections through Supabase Broadcast. */
export const SupabaseChannelTypingServiceLayer = Layer.effect(
  ChannelTypingServiceTag,
  Effect.gen(function* () {
    const client = yield* SupabaseChannelClientTag;
    return {
      connect: (channelId) => makeChannelTypingConnection(client, channelId),
    };
  })
);
