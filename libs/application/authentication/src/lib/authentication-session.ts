/**
 * Authentication information required by the application presentation layer.
 *
 * The type deliberately excludes Supabase session and token objects. Those
 * values belong to the infrastructure adapter and must not escape through the
 * application boundary.
 */
export interface AuthenticationSession {
  readonly userId: string;
  readonly email: string;
}
