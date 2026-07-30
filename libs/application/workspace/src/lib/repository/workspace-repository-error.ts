import { Data } from 'effect';

export class WorkspaceRepositoryUnavailableError extends Data.TaggedError(
  'WorkspaceRepositoryUnavailableError'
)<{
  readonly cause: unknown;
}> {}

export class InvalidWorkspaceDataError extends Data.TaggedError(
  'InvalidWorkspaceDataError'
)<{
  readonly cause: unknown;
}> {}

export type WorkspaceRepositoryError =
  | WorkspaceRepositoryUnavailableError
  | InvalidWorkspaceDataError;
