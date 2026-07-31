import { Data } from 'effect';
import type { MessageRepositoryError } from '../repository';

/**
 * Indicates that channel-message observation received an invalid channel ID.
 */
export class InvalidChannelMessageObservationInputError extends Data.TaggedError(
  'InvalidChannelMessageObservationInputError'
)<{
  readonly cause: unknown;
}> {}

export type ObserveChannelMessagesError =
  | InvalidChannelMessageObservationInputError
  | MessageRepositoryError;
