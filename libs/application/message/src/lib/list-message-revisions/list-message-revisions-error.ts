import { Data } from 'effect';
import type { MessageRepositoryError } from '../repository';

/** Indicates that a requested revision page size is unsupported. */
export class InvalidMessageRevisionPageLimitError extends Data.TaggedError(
  'InvalidMessageRevisionPageLimitError'
)<{
  readonly limit: number;
  readonly cause: unknown;
}> {}

/** Errors that can be produced while listing a message's revisions. */
export type ListMessageRevisionsError =
  | InvalidMessageRevisionPageLimitError
  | MessageRepositoryError;
