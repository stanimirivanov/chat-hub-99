import { Effect, Option } from 'effect';
import type {
  AnalysisJob,
  AnalysisJobExecution,
  AnalysisProcessorReceipt,
} from './analysis-job';
import type { AnalysisJobExecutionRepositoryError } from './analysis-run-error';
import {
  AnalysisRunRepositoryTag,
  type AnalysisRunRepository,
} from './analysis-run-repository';

export const DETERMINISTIC_ANALYSIS_PROCESSOR_VERSION =
  'analysis.deterministic.v1';

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
): AnalysisProcessorReceipt => ({
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

/** Non-mutating database readiness proof for the worker runtime. */
export const checkAnalysisWorkerReady: Effect.Effect<
  boolean,
  AnalysisJobExecutionRepositoryError,
  AnalysisRunRepository
> = Effect.flatMap(AnalysisRunRepositoryTag, (repository) =>
  repository.checkWorkerReady()
);
