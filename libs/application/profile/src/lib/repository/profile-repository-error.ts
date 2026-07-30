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

export type ProfileRepositoryError =
  | ProfileRepositoryUnavailableError
  | InvalidProfileDataError;
