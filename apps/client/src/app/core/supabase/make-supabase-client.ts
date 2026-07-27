import { createClient } from '@supabase/supabase-js';
import type { Database } from '@chat-hub/shared/database';
import type { ChatHubSupabaseClient } from '@chat-hub/infrastructure/message';
import type { SupabaseClientConfig } from './supabase-client-config';

/**
 * Creates the single browser Supabase client used by the application.
 */
export const makeSupabaseClient = (
  config: SupabaseClientConfig
): ChatHubSupabaseClient =>
  createClient<Database>(config.url, config.publishableKey);
