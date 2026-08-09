/// <reference types="node" />

import { createClient, type AuthError, type User } from '@supabase/supabase-js';
import { Context, Layer } from 'effect';

/** Result projection required from Supabase's authenticated-user lookup. */
export interface SupabaseAccessTokenUserResult {
  readonly data: { readonly user: User | null };
  readonly error: AuthError | null;
}

/** Supabase operations used by the stateless server authentication adapter. */
export interface SupabaseAccessTokenClient {
  readonly getUser: (
    accessToken: string
  ) => Promise<SupabaseAccessTokenUserResult>;
  readonly checkHealth: () => Promise<void>;
}

export const SupabaseAccessTokenClientTag =
  Context.GenericTag<SupabaseAccessTokenClient>(
    '@omoikane/infrastructure/authentication/SupabaseAccessTokenClient'
  );

/** Configuration owned by the server-side Supabase Auth client. */
export interface SupabaseAccessTokenClientConfig {
  readonly url: string;
  readonly anonKey: string;
  readonly readinessTimeoutMilliseconds: number;
}

/**
 * Creates the server-safe client projection used for token validation.
 *
 * The client never persists or refreshes sessions. The explicit Auth health
 * request follows Supabase's documented `/auth/v1/health` probe and is bounded
 * so readiness cannot wait indefinitely on a failed dependency.
 */
export const makeSupabaseAccessTokenClient = (
  config: SupabaseAccessTokenClientConfig
): SupabaseAccessTokenClient => {
  const supabaseUrl = config.url.replace(/\/+$/u, '');
  const client = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return {
    getUser: (accessToken) => client.auth.getUser(accessToken),
    checkHealth: async () => {
      const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
        headers: { apikey: config.anonKey },
        signal: AbortSignal.timeout(config.readinessTimeoutMilliseconds),
      });

      if (!response.ok) {
        throw new Error(
          `Supabase Auth health returned HTTP ${response.status}.`
        );
      }
    },
  };
};

/** Layer that owns construction of the configured server-side Supabase client. */
export const makeSupabaseAccessTokenClientLayer = (
  config: SupabaseAccessTokenClientConfig
): Layer.Layer<SupabaseAccessTokenClient> =>
  Layer.succeed(
    SupabaseAccessTokenClientTag,
    makeSupabaseAccessTokenClient(config)
  );
