import { createClient, type PostgrestError } from '@supabase/supabase-js';
import { Context, Layer } from 'effect';
import type { Database } from '@omoikane/shared/database';

type AnalysisRunRow = Database['public']['Tables']['analysis_runs']['Row'];
type StartArgs = Database['public']['Functions']['start_analysis_run']['Args'];
type GetArgs = Database['public']['Functions']['get_analysis_run']['Args'];

export interface SupabaseAnalysisResult {
  readonly data: AnalysisRunRow[] | null;
  readonly error: PostgrestError | null;
}

/** Focused RPC projection used by the privileged Analysis Run adapter. */
export interface SupabaseAnalysisClient {
  readonly start: (args: StartArgs) => PromiseLike<SupabaseAnalysisResult>;
  readonly get: (args: GetArgs) => PromiseLike<SupabaseAnalysisResult>;
}

export const SupabaseAnalysisClientTag =
  Context.GenericTag<SupabaseAnalysisClient>(
    '@omoikane/infrastructure/analysis/SupabaseAnalysisClient'
  );

export interface SupabaseAnalysisClientConfig {
  readonly url: string;
  readonly serviceRoleKey: string;
}

/**
 * Creates the narrowly projected privileged client used only by atomic
 * Analysis Run RPCs. The service-role credential never leaves server runtime
 * composition and is never used to establish caller identity.
 */
export const makeSupabaseAnalysisClient = (
  config: SupabaseAnalysisClientConfig
): SupabaseAnalysisClient => {
  const client = createClient<Database>(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return {
    start: (args) => client.rpc('start_analysis_run', args),
    get: (args) => client.rpc('get_analysis_run', args),
  };
};

export const makeSupabaseAnalysisClientLayer = (
  config: SupabaseAnalysisClientConfig
): Layer.Layer<SupabaseAnalysisClient> =>
  Layer.succeed(SupabaseAnalysisClientTag, makeSupabaseAnalysisClient(config));
