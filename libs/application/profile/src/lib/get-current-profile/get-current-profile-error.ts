import { Data } from 'effect';
import type { ProfileId } from '@chat-hub/domain/profile';
import type { ProfileRepositoryReadError } from '../repository';

/**
 * Indicates that current-profile input did not contain a valid profile UUID.
 */
export class InvalidCurrentProfileInputError extends Data.TaggedError(
  'InvalidCurrentProfileInputError'
)<{
  readonly cause: unknown;
}> {}

/**
 * Indicates that no RLS-visible current projection exists for the identity.
 */
export class CurrentProfileNotFoundError extends Data.TaggedError(
  'CurrentProfileNotFoundError'
)<{
  readonly profileId: ProfileId;
}> {}

export type GetCurrentProfileError =
  | InvalidCurrentProfileInputError
  | CurrentProfileNotFoundError
  | ProfileRepositoryReadError;
