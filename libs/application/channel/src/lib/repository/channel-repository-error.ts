import { Data } from 'effect';

/**
 * Indicates that channel discovery could not reach or query its provider.
 */
export class ChannelRepositoryUnavailableError extends Data.TaggedError(
  'ChannelRepositoryUnavailableError'
)<{
  readonly cause: unknown;
}> {}

/**
 * Indicates that an external channel row violated the domain contract.
 */
export class InvalidChannelDataError extends Data.TaggedError(
  'InvalidChannelDataError'
)<{
  readonly cause: unknown;
}> {}

export type ChannelRepositoryError =
  | ChannelRepositoryUnavailableError
  | InvalidChannelDataError;
