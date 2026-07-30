import { Data } from 'effect';

/**
 * Indicates that the profile provider could not be queried.
 */
export class ProfileRepositoryUnavailableError extends Data.TaggedError(
  'ProfileRepositoryUnavailableError'
)<{
  readonly cause: unknown;
}> {}

/**
 * Indicates that an external profile row violated the domain contract.
 */
export class InvalidProfileDataError extends Data.TaggedError(
  'InvalidProfileDataError'
)<{
  readonly cause: unknown;
}> {}

/**
 * Indicates that another current profile already owns the requested username.
 */
export class ProfileUsernameUnavailableError extends Data.TaggedError(
  'ProfileUsernameUnavailableError'
)<{
  readonly username: string;
}> {}

export type ProfileRepositoryReadError =
  | ProfileRepositoryUnavailableError
  | InvalidProfileDataError;

export type ProfileRepositoryUpdateError =
  | ProfileRepositoryReadError
  | ProfileUsernameUnavailableError;
