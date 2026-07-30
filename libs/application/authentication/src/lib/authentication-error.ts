import { Data } from 'effect';

/**
 * Authentication operations understood by the application layer.
 *
 * The vocabulary is provider-independent so Supabase-specific operation names
 * do not escape infrastructure.
 */
export type AuthenticationOperation =
  | 'restore-session'
  | 'sign-in'
  | 'sign-out'
  | 'observe-session';

/**
 * Indicates that supplied credentials were rejected.
 *
 * The error deliberately does not reveal whether the email exists.
 */
export class InvalidCredentialsError extends Data.TaggedError(
  'InvalidCredentialsError'
) {}

/**
 * Indicates that authentication could not be completed for a reason other
 * than rejected credentials.
 *
 * The infrastructure cause is preserved for diagnostics but must not be
 * rendered directly to the user.
 */
export class AuthenticationUnavailableError extends Data.TaggedError(
  'AuthenticationUnavailableError'
)<{
  readonly operation: AuthenticationOperation;
  readonly cause: unknown;
}> {}

/**
 * Expected authentication failures exposed by the application boundary.
 */
export type AuthenticationError =
  | InvalidCredentialsError
  | AuthenticationUnavailableError;
