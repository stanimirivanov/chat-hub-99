import { Data } from 'effect';
import type { WorkspaceMemberRoleChangeRepositoryError } from '../repository';

export type WorkspaceMemberRoleChangeField =
  | 'workspaceId'
  | 'profileId'
  | 'role';

/**
 * Indicates that one role-change field failed boundary validation.
 */
export class InvalidWorkspaceMemberRoleChangeInputError extends Data.TaggedError(
  'InvalidWorkspaceMemberRoleChangeInputError'
)<{
  readonly field: WorkspaceMemberRoleChangeField;
  readonly cause: unknown;
}> {}

export type ChangeWorkspaceMemberRoleError =
  | InvalidWorkspaceMemberRoleChangeInputError
  | WorkspaceMemberRoleChangeRepositoryError;
