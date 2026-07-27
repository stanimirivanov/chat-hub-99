import { Data } from 'effect';

/**
 * Indicates that a requested message page size is outside the supported range.
 */
export class InvalidMessagePageLimitError extends Data.TaggedError(
  'InvalidMessagePageLimitError'
)<{
  readonly limit: number;
  readonly cause: unknown;
}> {}
