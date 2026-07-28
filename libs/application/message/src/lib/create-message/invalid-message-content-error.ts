import { Data } from 'effect';

/**
 * Indicates that user-supplied message content does not satisfy the domain
 * message-content rules.
 */
export class InvalidMessageContentError extends Data.TaggedError(
  'InvalidMessageContentError'
)<{
  readonly content: string;
  readonly cause: unknown;
}> {
  override readonly message = 'The message content is invalid.';
}
