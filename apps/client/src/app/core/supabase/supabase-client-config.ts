/**
 * Browser-safe configuration required to construct the application Supabase
 * client.
 */
export interface SupabaseClientConfig {
  readonly url: string;
  readonly publishableKey: string;
}
