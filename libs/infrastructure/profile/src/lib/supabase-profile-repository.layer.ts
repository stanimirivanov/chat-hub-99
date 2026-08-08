import { Effect, Layer } from 'effect';
import { ProfileRepositoryTag } from '@omoikane/application/profile';
import { SupabaseProfileClientTag } from './supabase-profile-client';
import { makeSupabaseProfileRepository } from './supabase-profile-repository';

/**
 * Supplies the Supabase profile repository from its focused client.
 *
 * The Layer retrieves the configured client and registers the resulting
 * adapter under the application-owned repository key.
 */
export const SupabaseProfileRepositoryLayer = Layer.effect(
  ProfileRepositoryTag,
  Effect.gen(function* () {
    const client = yield* SupabaseProfileClientTag;
    return makeSupabaseProfileRepository(client);
  })
);
