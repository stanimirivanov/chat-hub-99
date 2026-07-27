import { Data } from 'effect';

/**
 * Indicates that a row returned by the current-messages database projection
 * could not be converted into a valid domain message.
 */
export class MessageRowMappingError extends Data.TaggedError(
  'MessageRowMappingError'
)<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
