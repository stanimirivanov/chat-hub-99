import type { SupabaseClient } from '@supabase/supabase-js';
import { Context } from 'effect';
import type { Database } from '@chat-hub/shared/database';

export type SupabaseWorkspaceClient = SupabaseClient<Database>;

export const SupabaseWorkspaceClientTag =
  Context.GenericTag<SupabaseWorkspaceClient>(
    '@chat-hub/infrastructure/workspace/SupabaseWorkspaceClient'
  );
