import type { SupabaseClient } from '@supabase/supabase-js';
import { Context } from 'effect';
import type { Database } from '@omoikane/shared/database';

/**
 * Generated-database-aware Supabase client used by the channel adapter.
 */
export type SupabaseChannelClient = SupabaseClient<Database>;

/**
 * Infrastructure-only key for the configured Supabase channel client.
 */
export const SupabaseChannelClientTag =
  Context.GenericTag<SupabaseChannelClient>(
    '@omoikane/infrastructure/channel/SupabaseChannelClient'
  );
