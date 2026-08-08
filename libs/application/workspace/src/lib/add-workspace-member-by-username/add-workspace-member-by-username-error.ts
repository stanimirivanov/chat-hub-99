import { Data } from 'effect';
import type { ProfileRepositoryReadError } from '@omoikane/application/profile';
import type { WorkspaceMemberAddRepositoryError } from '../repository';
import type { WorkspaceMemberCandidateField } from '../workspace-member-candidate/decode-workspace-member-candidate';

export type WorkspaceMemberAdditionField = WorkspaceMemberCandidateField;

/**
 * Indicates that one add-member field failed boundary validation.
 */
export class InvalidWorkspaceMemberAdditionInputError extends Data.TaggedError(
  'InvalidWorkspaceMemberAdditionInputError'
)<{
  readonly field: WorkspaceMemberAdditionField;
  readonly cause: unknown;
}> {}

/**
 * Indicates that no active RLS-visible profile owns the exact username.
 */
export class WorkspaceMemberCandidateNotFoundError extends Data.TaggedError(
  'WorkspaceMemberCandidateNotFoundError'
)<{
  readonly username: string;
}> {}

export type AddWorkspaceMemberByUsernameError =
  | InvalidWorkspaceMemberAdditionInputError
  | WorkspaceMemberCandidateNotFoundError
  | ProfileRepositoryReadError
  | WorkspaceMemberAddRepositoryError;
