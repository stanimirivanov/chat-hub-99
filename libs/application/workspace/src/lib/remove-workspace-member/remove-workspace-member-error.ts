import { Data } from 'effect';
import type { WorkspaceMemberRemovalRepositoryError } from '../repository';

export type WorkspaceMemberRemovalField =
  | 'workspaceId'
  | 'profileId'
  | 'reason';

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
