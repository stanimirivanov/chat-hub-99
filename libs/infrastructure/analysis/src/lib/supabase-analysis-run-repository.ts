import { Effect, Option, Schema } from 'effect';
import {
  AnalysisRunNotAccessibleError,
  AnalysisRunOutboxClaimLostError,
  AnalysisRunRepositoryUnavailableError,
  AnalysisJobSchema,
  AnalysisRunOutboxClaimSchema,
  InvalidAnalysisRunDataError,
  type AnalysisJob,
  type AnalysisRunOutboxClaim,
  type AnalysisRunRepository,
  type AnalysisRunRepositoryError,
  type AnalysisRunDispatchRepositoryError,
} from '@omoikane/application/analysis';
import { AnalysisRunSchema, type AnalysisRun } from '@omoikane/domain/analysis';
import type {
  SupabaseAnalysisClient,
  SupabaseAnalysisJobResult,
  SupabaseAnalysisOutboxResult,
  SupabaseAnalysisRunResult,
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
});
