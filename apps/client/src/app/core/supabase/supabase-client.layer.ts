import { Layer } from 'effect';
import { SupabaseMessageClientTag } from '@chat-hub/infrastructure/message';
import { makeSupabaseClient } from './make-supabase-client';
import type { SupabaseClientConfig } from './supabase-client-config';

/**
 * Creates the browser Supabase client Layer from explicit configuration.
 */
export const makeSupabaseClientLayer = (config: SupabaseClientConfig) =>
  Layer.succeed(SupabaseMessageClientTag, makeSupabaseClient(config));
