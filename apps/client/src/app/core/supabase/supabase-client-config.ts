import { environment } from '@client-environments/environment';

export interface SupabaseClientConfig {
  readonly url: string;
  readonly publishableKey: string;
}

/**
 * Creates the browser Supabase client configuration from the active Angular
 * environment.
 */
export const makeSupabaseClientConfig = (): SupabaseClientConfig => ({
  url: environment.supabase.url,
  publishableKey: environment.supabase.publishableKey,
});
