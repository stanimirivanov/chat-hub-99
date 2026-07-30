import type { SupabaseClient } from '@supabase/supabase-js';
import { Context } from 'effect';
import type { Database } from '@chat-hub/shared/database';

/**
 * Generated-database-aware Supabase client used by the profile adapter.
 */
export type SupabaseProfileClient = SupabaseClient<Database>;

/**
 * Infrastructure-only key for the configured Supabase profile client.
 */
export const SupabaseProfileClientTag =
  Context.GenericTag<SupabaseProfileClient>(
    '@chat-hub/infrastructure/profile/SupabaseProfileClient'
  );
