import { Data } from 'effect';
import type { ProfileRepositoryError } from '../repository';

/**
 * Indicates that author-profile discovery received an invalid identity list.
 */
export class InvalidCurrentProfilesInputError extends Data.TaggedError(
  'InvalidCurrentProfilesInputError'
)<{
  readonly cause: unknown;
}> {}

export type ListCurrentProfilesError =
  | InvalidCurrentProfilesInputError
  | ProfileRepositoryError;
