import { Context } from 'effect';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@omoikane/shared/database';

/**
 * Generated-database-aware Supabase client used by the message adapter.
 */
export type SupabaseMessageClient = SupabaseClient<Database>;

/**
 * Infrastructure-only key for the configured Supabase message client.
 */
export const SupabaseMessageClientTag =
  Context.GenericTag<SupabaseMessageClient>(
    '@omoikane/infrastructure/message/SupabaseMessageClient'
  );
