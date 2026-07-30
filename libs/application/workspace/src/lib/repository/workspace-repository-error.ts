import { Data } from 'effect';

/**
 * Indicates that workspace discovery could not reach or query its provider.
 */
export class WorkspaceRepositoryUnavailableError extends Data.TaggedError(
  'WorkspaceRepositoryUnavailableError'
)<{
  readonly cause: unknown;
}> {}

/**
 * Indicates that an external workspace row violated the domain contract.
 */
export class InvalidWorkspaceDataError extends Data.TaggedError(
  'InvalidWorkspaceDataError'
)<{
  readonly cause: unknown;
}> {}

export type WorkspaceRepositoryError =
  | WorkspaceRepositoryUnavailableError
  | InvalidWorkspaceDataError;
