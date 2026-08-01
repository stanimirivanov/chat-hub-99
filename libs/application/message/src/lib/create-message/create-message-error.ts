import { Data } from 'effect';
import type { MessageRepositoryCreateError } from '../repository';

export class InvalidMessageContentError extends Data.TaggedError(
  'InvalidMessageContentError'
)<{
  readonly cause: unknown;
}> {
  override readonly message = 'The message content is invalid.';
}

export type CreateMessageError =
  | InvalidMessageContentError
  | MessageRepositoryCreateError;
