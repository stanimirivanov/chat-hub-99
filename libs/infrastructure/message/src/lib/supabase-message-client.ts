import { Context } from 'effect';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@omoikane/shared/database';

export type ChatHubSupabaseClient = SupabaseClient<Database>;

export const SupabaseMessageClientTag =
  Context.GenericTag<ChatHubSupabaseClient>(
    '@omoikane/infrastructure/message/SupabaseClient'
  );
