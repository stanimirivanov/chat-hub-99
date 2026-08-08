import { Data } from 'effect';
import type { ChannelRepositoryRestoreError } from '../repository';

/** Indicates that the channel identity failed restoration-boundary validation. */
export class InvalidChannelRestoreInputError extends Data.TaggedError(
  'InvalidChannelRestoreInputError'
)<{
  readonly cause: unknown;
}> {}

export type RestoreChannelError =
  | InvalidChannelRestoreInputError
  | ChannelRepositoryRestoreError;
