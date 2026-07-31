import { Data } from 'effect';
import type { WorkspaceRepositoryCreateError } from '../repository';

export type WorkspaceCreationField = 'name' | 'slug' | 'description';

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
