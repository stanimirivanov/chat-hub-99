import { Data } from 'effect';
import type { ChannelRepositoryArchiveError } from '../repository';

/**
 * Indicates that the channel identity failed archive-boundary validation.
 */
export class InvalidChannelArchiveInputError extends Data.TaggedError(
  'InvalidChannelArchiveInputError'
)<{
  readonly cause: unknown;
}> {}

export type ArchiveChannelError =
  | InvalidChannelArchiveInputError
  | ChannelRepositoryArchiveError;
