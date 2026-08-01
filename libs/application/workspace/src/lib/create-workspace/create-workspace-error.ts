import { Data } from 'effect';
import type { WorkspaceRepositoryCreateError } from '../repository';
import type { WorkspaceDetailsField } from '../workspace-details/decode-workspace-details';

export type WorkspaceCreationField = WorkspaceDetailsField;

/**
 * Indicates that one workspace-creation field failed boundary validation.
 */
export class InvalidWorkspaceCreationInputError extends Data.TaggedError(
  'InvalidWorkspaceCreationInputError'
)<{
  readonly field: WorkspaceCreationField;
  readonly cause: unknown;
}> {}

export type CreateWorkspaceError =
  | InvalidWorkspaceCreationInputError
  | WorkspaceRepositoryCreateError;
