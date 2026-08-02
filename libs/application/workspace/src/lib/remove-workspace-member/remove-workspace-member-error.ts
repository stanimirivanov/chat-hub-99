import { Data } from 'effect';
import type { WorkspaceMemberRemovalRepositoryError } from '../repository';
import type { WorkspaceMemberMutationField } from '../workspace-member-mutation/decode-workspace-member-mutation';

export type WorkspaceMemberRemovalField = WorkspaceMemberMutationField;

/**
 * Indicates that one member-removal field failed boundary validation.
 */
export class InvalidWorkspaceMemberRemovalInputError extends Data.TaggedError(
  'InvalidWorkspaceMemberRemovalInputError'
)<{
  readonly field: WorkspaceMemberRemovalField;
  readonly cause: unknown;
}> {}

export type RemoveWorkspaceMemberError =
  | InvalidWorkspaceMemberRemovalInputError
  | WorkspaceMemberRemovalRepositoryError;
