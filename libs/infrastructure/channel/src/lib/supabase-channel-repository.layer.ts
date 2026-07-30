import { Effect, Layer } from 'effect';
import { ChannelRepositoryTag } from '@chat-hub/application/channel';
import { SupabaseChannelClientTag } from './supabase-channel-client';
import { makeSupabaseChannelRepository } from './supabase-channel-repository';

/**
 * Supplies the Supabase channel repository from its focused client.
 *
 * The Layer is a construction recipe: it retrieves the configured client from
 * the Effect environment and registers the resulting adapter under the
 * application-owned repository key.
 */
export const SupabaseChannelRepositoryLayer = Layer.effect(
  ChannelRepositoryTag,
  Effect.gen(function* () {
    const client = yield* SupabaseChannelClientTag;
    return makeSupabaseChannelRepository(client);
  })
);
