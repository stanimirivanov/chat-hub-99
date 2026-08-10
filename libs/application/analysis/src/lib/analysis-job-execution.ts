import { Data, Effect, Option } from 'effect';
import type {
  AnalysisFailureCategory,
  AnalysisJob,
  AnalysisJobExecution,
  AnalysisJobFailureCompletion,
  AnalysisProcessorReceipt,
} from './analysis-job';
import type { AnalysisJobExecutionRepositoryError } from './analysis-run-error';
import {
  AnalysisRunRepositoryTag,
  type AnalysisRunRepository,
} from './analysis-run-repository';

export const DETERMINISTIC_ANALYSIS_PROCESSOR_VERSION =
  'analysis.deterministic.v1';

export class RetryableAnalysisProcessorError extends Data.TaggedError(
  'RetryableAnalysisProcessorError'
)<{ readonly category: AnalysisFailureCategory }> {}

export class TerminalAnalysisProcessorError extends Data.TaggedError(
  'TerminalAnalysisProcessorError'
)<{ readonly category: AnalysisFailureCategory }> {}

export type AnalysisProcessorError =
  | RetryableAnalysisProcessorError
  | TerminalAnalysisProcessorError;

export type AnalysisJobProcessor = (
  execution: AnalysisJobExecution
) => Effect.Effect<AnalysisProcessorReceipt, AnalysisProcessorError>;

export interface AcquireNextAnalysisJobInput {
  readonly workerId: string;
  readonly leaseSeconds: number;
}

/** Acquires at most one job; absence is ordinary idle-loop behavior. */
export const acquireNextAnalysisJob = (
  input: AcquireNextAnalysisJobInput
): Effect.Effect<
  Option.Option<AnalysisJobExecution>,
  AnalysisJobExecutionRepositoryError,
  AnalysisRunRepository
> =>
  Effect.flatMap(AnalysisRunRepositoryTag, (repository) =>
    repository.acquireNextJob({
      workerId: input.workerId,
      processorVersion: DETERMINISTIC_ANALYSIS_PROCESSOR_VERSION,
      leaseSeconds: input.leaseSeconds,
    })
  );

/**
 * Produces a deterministic receipt without network access or content reads.
 * Canonical durable identities make duplicate processing yield the same value.
 */
export const processAnalysisJob = (
  execution: AnalysisJobExecution
): Effect.Effect<AnalysisProcessorReceipt, AnalysisProcessorError> =>
  Effect.succeed({
    processorVersion: DETERMINISTIC_ANALYSIS_PROCESSOR_VERSION,
    resultFingerprint: [
      DETERMINISTIC_ANALYSIS_PROCESSOR_VERSION,
      execution.analysisRunId,
      execution.jobId,
    ].join('/'),
  });

export interface CompleteAnalysisJobSuccessInput {
  readonly execution: AnalysisJobExecution;
  readonly receipt: AnalysisProcessorReceipt;
  readonly durationMilliseconds: number;
}

/** Commits deterministic success only while the execution still owns its lease. */
export const completeAnalysisJobSuccess = (
  input: CompleteAnalysisJobSuccessInput
): Effect.Effect<
  AnalysisJob,
  AnalysisJobExecutionRepositoryError,
  AnalysisRunRepository
> =>
  Effect.flatMap(AnalysisRunRepositoryTag, (repository) =>
    repository.completeJobSuccess({
      execution: input.execution,
      resultFingerprint: input.receipt.resultFingerprint,
      durationMilliseconds: input.durationMilliseconds,
    })
  );

export interface CompleteAnalysisJobFailureInput {
  readonly execution: AnalysisJobExecution;
  readonly failureCategory: AnalysisFailureCategory;
  readonly retryable: boolean;
  readonly durationMilliseconds: number;
}

/** Commits one classified processor failure while its lease remains current. */
export const completeAnalysisJobFailure = (
  input: CompleteAnalysisJobFailureInput
): Effect.Effect<
  AnalysisJobFailureCompletion,
  AnalysisJobExecutionRepositoryError,
  AnalysisRunRepository
> =>
  Effect.flatMap(AnalysisRunRepositoryTag, (repository) =>
    repository.completeJobFailure({
      execution: input.execution,
      failureCategory: input.failureCategory,
      retryable: input.retryable,
      durationMilliseconds: input.durationMilliseconds,
    })
  );

/** Non-mutating database readiness proof for the worker runtime. */
export const checkAnalysisWorkerReady: Effect.Effect<
  boolean,
  AnalysisJobExecutionRepositoryError,
  AnalysisRunRepository
> = Effect.flatMap(AnalysisRunRepositoryTag, (repository) =>
  repository.checkWorkerReady()
);
