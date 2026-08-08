import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@omoikane/shared/database';
import type { SupabaseClientConfig } from './supabase-client-config';

/**
 * Creates the single typed Supabase browser client used by all infrastructure
 * adapters.
 *
 * Runtime composition provides this same client instance under each focused
 * infrastructure client Tag. The factory does not depend on any individual
 * feature adapter.
 */
export const makeSupabaseClient = (
  config: SupabaseClientConfig
): SupabaseClient<Database> =>
  createClient<Database>(config.url, config.publishableKey);
