import { Context } from 'effect';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@chat-hub/shared/database';

export type ChatHubSupabaseClient = SupabaseClient<Database>;

export const SupabaseMessageClientTag =
  Context.GenericTag<ChatHubSupabaseClient>(
    '@chat-hub/infrastructure/message/SupabaseClient'
  );
