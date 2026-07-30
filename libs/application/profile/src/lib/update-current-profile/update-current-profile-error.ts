import { Data } from 'effect';
import type { ProfileRepositoryUpdateError } from '../repository';

export type ProfileUpdateField = 'displayName' | 'username' | 'avatarUrl';

/**
 * Indicates that one current-profile update field failed boundary validation.
 */
export class InvalidProfileUpdateInputError extends Data.TaggedError(
  'InvalidProfileUpdateInputError'
)<{
  readonly field: ProfileUpdateField;
  readonly cause: unknown;
}> {}

export type UpdateCurrentProfileError =
  | InvalidProfileUpdateInputError
  | ProfileRepositoryUpdateError;
