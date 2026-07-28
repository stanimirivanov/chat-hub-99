import { Data } from 'effect';
import type { MessageRepositoryError } from '../repository';

/**
 * Indicates that a requested message page size is outside the supported range.
 */
export class InvalidMessagePageLimitError extends Data.TaggedError(
  'InvalidMessagePageLimitError'
)<{
  readonly limit: number;
  readonly cause: unknown;
}> {}

/**
 * Errors that can be produced while listing messages for a channel.
 */
export type ListChannelMessagesError =
  | InvalidMessagePageLimitError
  | MessageRepositoryError;
