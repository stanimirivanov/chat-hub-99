import { Data } from 'effect';

export type AnalysisRunInputField =
  | 'requestIdentity'
  | 'workspaceId'
  | 'analysisRunId'
  | 'traceContext'
  | 'dispatcherId';

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

/** The dispatch lease was superseded or expired before publication. */
export class AnalysisRunOutboxClaimLostError extends Data.TaggedError(
  'AnalysisRunOutboxClaimLostError'
) {}

/** The job attempt lease expired or was replaced before completion. */
export class AnalysisJobLeaseLostError extends Data.TaggedError(
  'AnalysisJobLeaseLostError'
) {}

/** Persistence was unavailable during an Analysis Run operation. */
export class AnalysisRunRepositoryUnavailableError extends Data.TaggedError(
  'AnalysisRunRepositoryUnavailableError'
)<{
  readonly operation:
    | 'start'
    | 'get'
    | 'claimOutbox'
    | 'dispatchOutbox'
    | 'healthWorker'
    | 'acquireJob'
    | 'completeJob'
    | 'failJob';
  readonly cause: unknown;
}> {}

export type AnalysisRunRepositoryError =
  | AnalysisRunNotAccessibleError
  | InvalidAnalysisRunDataError
  | AnalysisRunRepositoryUnavailableError;

export type AnalysisRunError =
  | InvalidAnalysisRunInputError
  | AnalysisRunRepositoryError;

/** Failures specific to the internal outbox dispatch workflow. */
export type AnalysisRunDispatchError =
  | InvalidAnalysisRunInputError
  | AnalysisRunDispatchRepositoryError;

export type AnalysisRunDispatchRepositoryError =
  | AnalysisRunOutboxClaimLostError
  | InvalidAnalysisRunDataError
  | AnalysisRunRepositoryUnavailableError;

export type AnalysisJobExecutionRepositoryError =
  | AnalysisJobLeaseLostError
  | InvalidAnalysisRunDataError
  | AnalysisRunRepositoryUnavailableError;
