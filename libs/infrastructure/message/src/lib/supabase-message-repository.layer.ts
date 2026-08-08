import { Effect, Layer } from 'effect';

import { MessageRepositoryTag } from '@omoikane/application/message';
import { SupabaseMessageClientTag } from './supabase-message-client';
import { makeSupabaseMessageRepository } from './supabase-message-repository';

/**
 * Provides the Supabase implementation of {@link MessageRepository}.
 *
 * The layer translates the infrastructure-level Supabase client dependency
 * into the application-level repository service expected by message use
 * cases.
 */
export const SupabaseMessageRepositoryLayer = Layer.effect(
  MessageRepositoryTag,
  Effect.gen(function* () {
    const client = yield* SupabaseMessageClientTag;
    return makeSupabaseMessageRepository(client);
  })
);
