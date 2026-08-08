import type { SupabaseClient } from '@supabase/supabase-js';
import { Context } from 'effect';
import type { Database } from '@omoikane/shared/database';

/**
 * Generated-database-aware Supabase client used by the profile adapter.
 */
export type SupabaseProfileClient = SupabaseClient<Database>;

/**
 * Infrastructure-only key for the configured Supabase profile client.
 */
export const SupabaseProfileClientTag =
  Context.GenericTag<SupabaseProfileClient>(
    '@omoikane/infrastructure/profile/SupabaseProfileClient'
  );
