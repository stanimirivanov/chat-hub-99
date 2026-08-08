import type { SupabaseClient } from '@supabase/supabase-js';
import { Context } from 'effect';
import type { Database } from '@omoikane/shared/database';

/**
 * Generated-database-aware Supabase client used by the workspace adapter.
 */
export type SupabaseWorkspaceClient = SupabaseClient<Database>;

/**
 * Infrastructure-only Effect service key for the configured Supabase client.
 *
 * The adapter Layer requests this Tag; the Angular composition root supplies
 * the single browser client instance.
 */
export const SupabaseWorkspaceClientTag =
  Context.GenericTag<SupabaseWorkspaceClient>(
    '@omoikane/infrastructure/workspace/SupabaseWorkspaceClient'
  );
