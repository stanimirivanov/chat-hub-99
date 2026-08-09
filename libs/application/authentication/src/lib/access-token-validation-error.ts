import { Data } from 'effect';

/** The supplied bearer credential cannot establish a current identity. */
export class InvalidAccessTokenError extends Data.TaggedError(
  'InvalidAccessTokenError'
) {}

/** The identity provider could not validate a bearer credential. */
export class AccessTokenValidationUnavailableError extends Data.TaggedError(
  'AccessTokenValidationUnavailableError'
)<{
  readonly cause: unknown;
}> {}

/** Expected failures produced by server access-token validation. */
export type AccessTokenValidationError =
  | InvalidAccessTokenError
  | AccessTokenValidationUnavailableError;
