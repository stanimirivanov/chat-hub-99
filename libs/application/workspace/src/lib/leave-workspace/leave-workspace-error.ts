import { Data } from 'effect';
import type { WorkspaceDepartureRepositoryError } from '../repository';

/**
 * Indicates that the workspace identity failed departure-boundary validation.
 */
export class InvalidWorkspaceDepartureInputError extends Data.TaggedError(
  'InvalidWorkspaceDepartureInputError'
)<{
  readonly cause: unknown;
}> {}

export type LeaveWorkspaceError =
  | InvalidWorkspaceDepartureInputError
  | WorkspaceDepartureRepositoryError;
