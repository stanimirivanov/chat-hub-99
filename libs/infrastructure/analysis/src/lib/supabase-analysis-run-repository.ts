import { Effect, Schema } from 'effect';
import {
  AnalysisRunNotAccessibleError,
  AnalysisRunRepositoryUnavailableError,
  InvalidAnalysisRunDataError,
  type AnalysisRunRepository,
  type AnalysisRunRepositoryError,
} from '@omoikane/application/analysis';
import { AnalysisRunSchema, type AnalysisRun } from '@omoikane/domain/analysis';
import type {
  SupabaseAnalysisClient,
  SupabaseAnalysisResult,
} from './supabase-analysis-client';

const mapResult = (
  result: SupabaseAnalysisResult,
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
  request: () => PromiseLike<SupabaseAnalysisResult>
): Effect.Effect<AnalysisRun, AnalysisRunRepositoryError> =>
  Effect.tryPromise({
    try: () => request(),
    catch: (cause) =>
      new AnalysisRunRepositoryUnavailableError({ operation, cause }),
  }).pipe(Effect.flatMap((result) => mapResult(result, operation)));

/** Constructs the Supabase implementation of the Analysis Run repository. */
export const makeSupabaseAnalysisRunRepository = (
  client: SupabaseAnalysisClient
): AnalysisRunRepository => ({
  start: ({ identity, workspaceId }) =>
    execute('start', () =>
      client.start({
        p_workspace_id: workspaceId,
        p_requested_by: identity.userId,
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
});
