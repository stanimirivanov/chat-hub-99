import { Data } from 'effect';

export type AnalysisRunInputField =
  | 'requestIdentity'
  | 'workspaceId'
  | 'analysisRunId'
  | 'traceContext';

/** An Analysis Run command received malformed provider-independent input. */
export class InvalidAnalysisRunInputError extends Data.TaggedError(
  'InvalidAnalysisRunInputError'
)<{ readonly field: AnalysisRunInputField; readonly cause: unknown }> {}

/** The requested workspace or run is inaccessible without revealing existence. */
export class AnalysisRunNotAccessibleError extends Data.TaggedError(
  'AnalysisRunNotAccessibleError'
) {}

/** A provider result failed the supported Analysis Run runtime contract. */
export class InvalidAnalysisRunDataError extends Data.TaggedError(
  'InvalidAnalysisRunDataError'
)<{ readonly cause: unknown }> {}

/** Persistence was unavailable during an Analysis Run operation. */
export class AnalysisRunRepositoryUnavailableError extends Data.TaggedError(
  'AnalysisRunRepositoryUnavailableError'
)<{
  readonly operation: 'start' | 'get';
  readonly cause: unknown;
}> {}

export type AnalysisRunRepositoryError =
  | AnalysisRunNotAccessibleError
  | InvalidAnalysisRunDataError
  | AnalysisRunRepositoryUnavailableError;

export type AnalysisRunError =
  | InvalidAnalysisRunInputError
  | AnalysisRunRepositoryError;
