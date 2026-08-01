import { Data } from 'effect';
import type { WorkspaceRepositoryUpdateError } from '../repository';
import type { WorkspaceDetailsField } from '../workspace-details/decode-workspace-details';

export type WorkspaceUpdateField = 'workspaceId' | WorkspaceDetailsField;

/**
 * Indicates that one workspace-update field failed boundary validation.
 */
export class InvalidWorkspaceUpdateInputError extends Data.TaggedError(
  'InvalidWorkspaceUpdateInputError'
)<{
  readonly field: WorkspaceUpdateField;
  readonly cause: unknown;
}> {}

export type UpdateWorkspaceError =
  | InvalidWorkspaceUpdateInputError
  | WorkspaceRepositoryUpdateError;
