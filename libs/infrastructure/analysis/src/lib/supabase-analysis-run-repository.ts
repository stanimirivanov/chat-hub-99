import { Effect, Option, Schema } from 'effect';
import {
  AnalysisRunNotAccessibleError,
  AnalysisRunOutboxClaimLostError,
  AnalysisRunRepositoryUnavailableError,
  AnalysisJobSchema,
  AnalysisJobExecutionSchema,
  AnalysisJobFailureCompletionSchema,
  AnalysisJobLeaseLostError,
  AnalysisRunOutboxClaimSchema,
  InvalidAnalysisRunDataError,
  type AnalysisJob,
  type AnalysisJobExecution,
  type AnalysisJobFailureCompletion,
  type AnalysisJobExecutionRepositoryError,
  type AnalysisRunOutboxClaim,
  type AnalysisRunRepository,
  type AnalysisRunRepositoryError,
  type AnalysisRunDispatchRepositoryError,
} from '@omoikane/application/analysis';
import { AnalysisRunSchema, type AnalysisRun } from '@omoikane/domain/analysis';
import type {
  SupabaseAnalysisClient,
  SupabaseAnalysisJobResult,
  SupabaseAnalysisJobAcquisitionResult,
  SupabaseAnalysisJobFailureResult,
  SupabaseAnalysisOutboxResult,
  SupabaseAnalysisRunResult,
  SupabaseAnalysisWorkerReadyResult,
} from './supabase-analysis-client';

const mapResult = (
  result: SupabaseAnalysisRunResult,
  operation: 'start' | 'get'
): Effect.Effect<AnalysisRun, AnalysisRunRepositoryError> => {
  if (result.error !== null) {
    return result.error.code === 'P0002'
      ? Effect.fail(new AnalysisRunNotAccessibleError())
      : Effect.fail(
          new AnalysisRunRepositoryUnavailableError({
            operation,
            cause: result.error,
          })
        );
  }

  const row = result.data?.[0];
  if (row === undefined) {
    return Effect.fail(
      new InvalidAnalysisRunDataError({
        cause: `The ${operation} command returned no Analysis Run.`,
      })
    );
  }

  return Schema.decodeUnknown(AnalysisRunSchema)({
    id: row.analysis_run_id,
    workspaceId: row.workspace_id,
    requestedBy: row.requested_by,
    status: row.status,
    createdAt: new Date(row.created_at),
  }).pipe(
    Effect.mapError((cause) => new InvalidAnalysisRunDataError({ cause }))
  );
};

const execute = (
  operation: 'start' | 'get',
  request: () => PromiseLike<SupabaseAnalysisRunResult>
): Effect.Effect<AnalysisRun, AnalysisRunRepositoryError> =>
  Effect.tryPromise({
    try: () => request(),
    catch: (cause) =>
      new AnalysisRunRepositoryUnavailableError({ operation, cause }),
  }).pipe(
    Effect.flatMap((result) => mapResult(result, operation)),
    Effect.withSpan(`supabase.analysis_run.${operation}`, { kind: 'client' })
  );

const mapOutboxClaim = (
  result: SupabaseAnalysisOutboxResult
): Effect.Effect<
  Option.Option<AnalysisRunOutboxClaim>,
  AnalysisRunDispatchRepositoryError
> => {
  if (result.error !== null) {
    return Effect.fail(
      new AnalysisRunRepositoryUnavailableError({
        operation: 'claimOutbox',
        cause: result.error,
      })
    );
  }

  const row = result.data?.[0];
  if (row === undefined) {
    return Effect.succeed(Option.none());
  }

  return Schema.decodeUnknown(AnalysisRunOutboxClaimSchema)({
    eventId: row.analysis_run_outbox_event_id,
    claimToken: row.claim_token,
    traceContext: {
      traceparent: row.traceparent,
      tracestate: row.tracestate,
    },
  }).pipe(
    Effect.map(Option.some),
    Effect.mapError((cause) => new InvalidAnalysisRunDataError({ cause }))
  );
};

const mapJob = (
  result: SupabaseAnalysisJobResult
): Effect.Effect<AnalysisJob, AnalysisRunDispatchRepositoryError> => {
  if (result.error !== null) {
    return result.error.code === 'P0003'
      ? Effect.fail(new AnalysisRunOutboxClaimLostError())
      : Effect.fail(
          new AnalysisRunRepositoryUnavailableError({
            operation: 'dispatchOutbox',
            cause: result.error,
          })
        );
  }

  const row = result.data?.[0];
  if (row === undefined) {
    return Effect.fail(
      new InvalidAnalysisRunDataError({
        cause: 'The dispatch command returned no Analysis job.',
      })
    );
  }

  return Schema.decodeUnknown(AnalysisJobSchema)({
    id: row.analysis_job_id,
    analysisRunId: row.analysis_run_id,
    workspaceId: row.workspace_id,
    kind: row.job_kind,
    version: row.job_version,
    availableAt: new Date(row.available_at),
  }).pipe(
    Effect.mapError((cause) => new InvalidAnalysisRunDataError({ cause }))
  );
};

const mapJobExecution = (
  result: SupabaseAnalysisJobAcquisitionResult
): Effect.Effect<
  Option.Option<AnalysisJobExecution>,
  AnalysisJobExecutionRepositoryError
> => {
  if (result.error !== null) {
    return Effect.fail(
      new AnalysisRunRepositoryUnavailableError({
        operation: 'acquireJob',
        cause: result.error,
      })
    );
  }

  const row = result.data?.[0];
  if (row === undefined) {
    return Effect.succeed(Option.none());
  }

  return Schema.decodeUnknown(AnalysisJobExecutionSchema)({
    jobId: row.analysis_job_id,
    attemptId: row.analysis_job_attempt_id,
    analysisRunId: row.analysis_run_id,
    workspaceId: row.workspace_id,
    kind: row.job_kind,
    version: row.job_version,
    attemptNumber: row.attempt_number,
    leaseToken: row.lease_token,
    leaseExpiresAt: new Date(row.lease_expires_at),
    processorVersion: row.processor_version,
    traceContext: {
      traceparent: row.traceparent,
      tracestate: row.tracestate,
    },
  }).pipe(
    Effect.map(Option.some),
    Effect.mapError((cause) => new InvalidAnalysisRunDataError({ cause }))
  );
};

const mapWorkerReady = (
  result: SupabaseAnalysisWorkerReadyResult
): Effect.Effect<boolean, AnalysisJobExecutionRepositoryError> => {
  if (result.error !== null) {
    return Effect.fail(
      new AnalysisRunRepositoryUnavailableError({
        operation: 'healthWorker',
        cause: result.error,
      })
    );
  }

  return result.data === true
    ? Effect.succeed(true)
    : Effect.fail(
        new InvalidAnalysisRunDataError({
          cause: 'The Analysis worker readiness command returned false.',
        })
      );
};

const mapCompletedJob = (
  result: SupabaseAnalysisJobResult
): Effect.Effect<AnalysisJob, AnalysisJobExecutionRepositoryError> => {
  if (result.error?.code === 'P0003') {
    return Effect.fail(new AnalysisJobLeaseLostError());
  }
  if (result.error !== null) {
    return Effect.fail(
      new AnalysisRunRepositoryUnavailableError({
        operation: 'completeJob',
        cause: result.error,
      })
    );
  }

  const row = result.data?.[0];
  if (row === undefined) {
    return Effect.fail(
      new InvalidAnalysisRunDataError({
        cause: 'The completion command returned no Analysis job.',
      })
    );
  }

  return Schema.decodeUnknown(AnalysisJobSchema)({
    id: row.analysis_job_id,
    analysisRunId: row.analysis_run_id,
    workspaceId: row.workspace_id,
    kind: row.job_kind,
    version: row.job_version,
    availableAt: new Date(row.available_at),
  }).pipe(
    Effect.mapError((cause) => new InvalidAnalysisRunDataError({ cause }))
  );
};

const mapFailedJob = (
  result: SupabaseAnalysisJobFailureResult
): Effect.Effect<
  AnalysisJobFailureCompletion,
  AnalysisJobExecutionRepositoryError
> => {
  if (result.error?.code === 'P0003') {
    return Effect.fail(new AnalysisJobLeaseLostError());
  }
  if (result.error !== null) {
    return Effect.fail(
      new AnalysisRunRepositoryUnavailableError({
        operation: 'failJob',
        cause: result.error,
      })
    );
  }

  const row = result.data?.[0];
  if (row === undefined) {
    return Effect.fail(
      new InvalidAnalysisRunDataError({
        cause: 'The failed-completion command returned no Analysis job.',
      })
    );
  }

  const nextAvailableAt = row.next_available_at as string | null;
  return Schema.decodeUnknown(AnalysisJobFailureCompletionSchema)({
    jobId: row.analysis_job_id,
    analysisRunId: row.analysis_run_id,
    attemptNumber: row.attempt_number,
    outcome: row.completion_outcome,
    failureCategory: row.failure_category,
    nextAvailableAt:
      nextAvailableAt === null ? null : new Date(nextAvailableAt),
  }).pipe(
    Effect.mapError((cause) => new InvalidAnalysisRunDataError({ cause }))
  );
};

/** Constructs the Supabase implementation of the Analysis Run repository. */
export const makeSupabaseAnalysisRunRepository = (
  client: SupabaseAnalysisClient
): AnalysisRunRepository => ({
  start: ({ identity, workspaceId, traceContext }) =>
    execute('start', () =>
      client.start({
        p_workspace_id: workspaceId,
        p_requested_by: identity.userId,
        p_traceparent: traceContext.traceparent,
        ...(traceContext.tracestate === null
          ? {}
          : { p_tracestate: traceContext.tracestate }),
      })
    ),
  get: ({ identity, workspaceId, analysisRunId }) =>
    execute('get', () =>
      client.get({
        p_workspace_id: workspaceId,
        p_analysis_run_id: analysisRunId,
        p_requested_by: identity.userId,
      })
    ),
  claimNextOutboxEvent: ({ dispatcherId, leaseSeconds }) =>
    Effect.tryPromise({
      try: () =>
        client.claimNextOutboxEvent({
          p_claimed_by: dispatcherId,
          p_lease_seconds: leaseSeconds,
        }),
      catch: (cause) =>
        new AnalysisRunRepositoryUnavailableError({
          operation: 'claimOutbox',
          cause,
        }),
    }).pipe(
      Effect.flatMap(mapOutboxClaim),
      Effect.withSpan('supabase.analysis_run_outbox.claim', { kind: 'client' })
    ),
  dispatchOutboxEvent: ({ eventId, claimToken }) =>
    Effect.tryPromise({
      try: () =>
        client.dispatchOutboxEvent({
          p_event_id: eventId,
          p_claim_token: claimToken,
        }),
      catch: (cause) =>
        new AnalysisRunRepositoryUnavailableError({
          operation: 'dispatchOutbox',
          cause,
        }),
    }).pipe(
      Effect.flatMap(mapJob),
      Effect.withSpan('supabase.analysis_run_outbox.dispatch', {
        kind: 'client',
      })
    ),
  checkWorkerReady: () =>
    Effect.tryPromise({
      try: () => client.checkWorkerReady(),
      catch: (cause) =>
        new AnalysisRunRepositoryUnavailableError({
          operation: 'healthWorker',
          cause,
        }),
    }).pipe(
      Effect.flatMap(mapWorkerReady),
      Effect.withSpan('supabase.analysis_worker.ready', { kind: 'client' })
    ),
  acquireNextJob: ({ workerId, processorVersion, leaseSeconds }) =>
    Effect.tryPromise({
      try: () =>
        client.acquireNextJob({
          p_lease_owner: workerId,
          p_processor_version: processorVersion,
          p_lease_seconds: leaseSeconds,
        }),
      catch: (cause) =>
        new AnalysisRunRepositoryUnavailableError({
          operation: 'acquireJob',
          cause,
        }),
    }).pipe(
      Effect.flatMap(mapJobExecution),
      Effect.withSpan('supabase.analysis_job.acquire', { kind: 'client' })
    ),
  completeJobSuccess: ({
    execution,
    resultFingerprint,
    durationMilliseconds,
  }) =>
    Effect.tryPromise({
      try: () =>
        client.completeJobSuccess({
          p_job_id: execution.jobId,
          p_attempt_id: execution.attemptId,
          p_lease_token: execution.leaseToken,
          p_result_fingerprint: resultFingerprint,
          p_duration_milliseconds: durationMilliseconds,
        }),
      catch: (cause) =>
        new AnalysisRunRepositoryUnavailableError({
          operation: 'completeJob',
          cause,
        }),
    }).pipe(
      Effect.flatMap(mapCompletedJob),
      Effect.withSpan('supabase.analysis_job.complete', { kind: 'client' })
    ),
  completeJobFailure: ({
    execution,
    failureCategory,
    retryable,
    durationMilliseconds,
  }) =>
    Effect.tryPromise({
      try: () =>
        client.completeJobFailure({
          p_job_id: execution.jobId,
          p_attempt_id: execution.attemptId,
          p_lease_token: execution.leaseToken,
          p_failure_category: failureCategory,
          p_retryable: retryable,
          p_duration_milliseconds: durationMilliseconds,
        }),
      catch: (cause) =>
        new AnalysisRunRepositoryUnavailableError({
          operation: 'failJob',
          cause,
        }),
    }).pipe(
      Effect.flatMap(mapFailedJob),
      Effect.withSpan('supabase.analysis_job.fail', { kind: 'client' })
    ),
});
