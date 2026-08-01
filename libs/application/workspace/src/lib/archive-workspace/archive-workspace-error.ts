import { Data } from 'effect';
import type { WorkspaceRepositoryArchiveError } from '../repository';

/**
 * Indicates that the workspace identity failed archive-boundary validation.
 */
export class InvalidWorkspaceArchiveInputError extends Data.TaggedError(
  'InvalidWorkspaceArchiveInputError'
)<{
  readonly cause: unknown;
}> {}

export type ArchiveWorkspaceError =
  | InvalidWorkspaceArchiveInputError
  | WorkspaceRepositoryArchiveError;
