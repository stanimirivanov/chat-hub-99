import { Data } from 'effect';
import type { MessageRepositoryError } from '../repository';

/** Search text is blank after normalization or exceeds the supported limit. */
export class InvalidMessageSearchQueryError extends Data.TaggedError(
  'InvalidMessageSearchQueryError'
)<{
  readonly cause: unknown;
}> {}

export type SearchWorkspaceMessagesError =
  | InvalidMessageSearchQueryError
  | MessageRepositoryError;
