import { Data } from 'effect';
import type { MessageRepositoryEditError } from '../repository';

/**
 * Indicates that proposed message content violates the domain contract.
 */
export class InvalidEditedMessageContentError extends Data.TaggedError(
  'InvalidEditedMessageContentError'
)<{
  readonly cause: unknown;
}> {
  override readonly message = 'The edited message content is invalid.';
}

export type EditMessageError =
  | InvalidEditedMessageContentError
  | MessageRepositoryEditError;
