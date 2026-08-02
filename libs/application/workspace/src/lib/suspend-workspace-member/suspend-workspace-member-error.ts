import { Data } from 'effect';
import type { WorkspaceMemberSuspensionRepositoryError } from '../repository';
import type { WorkspaceMemberMutationField } from '../workspace-member-mutation/decode-workspace-member-mutation';

export type WorkspaceMemberSuspensionField = WorkspaceMemberMutationField;

/**
 * Indicates that one member-suspension field failed boundary validation.
 */
export class InvalidWorkspaceMemberSuspensionInputError extends Data.TaggedError(
  'InvalidWorkspaceMemberSuspensionInputError'
)<{
  readonly field: WorkspaceMemberSuspensionField;
  readonly cause: unknown;
}> {}

export type SuspendWorkspaceMemberError =
  | InvalidWorkspaceMemberSuspensionInputError
  | WorkspaceMemberSuspensionRepositoryError;
