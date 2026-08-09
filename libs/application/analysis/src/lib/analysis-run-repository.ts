import { Context, type Effect } from 'effect';
import type { AuthenticatedRequestIdentity } from '@omoikane/application/authentication';
import type { AnalysisRun, AnalysisRunId } from '@omoikane/domain/analysis';
import type { WorkspaceId } from '@omoikane/domain/workspace';
import type { AnalysisRunRepositoryError } from './analysis-run-error';

interface ScopedAnalysisRunRequest {
  readonly identity: AuthenticatedRequestIdentity;
  readonly workspaceId: WorkspaceId;
}

export interface StartAnalysisRunCommand extends ScopedAnalysisRunRequest {
  readonly traceContext: AnalysisRunProcessingTraceContext;
}

/** Safe W3C carrier persisted with asynchronous Analysis Run intent. */
export interface AnalysisRunProcessingTraceContext {
  readonly traceparent: string;
  readonly tracestate: string | null;
}

export interface GetAnalysisRunQuery extends ScopedAnalysisRunRequest {
  readonly analysisRunId: AnalysisRunId;
}

/** Capability-oriented persistence boundary for starting and observing runs. */
export interface AnalysisRunRepository {
  readonly start: (
    command: StartAnalysisRunCommand
  ) => Effect.Effect<AnalysisRun, AnalysisRunRepositoryError>;
  readonly get: (
    query: GetAnalysisRunQuery
  ) => Effect.Effect<AnalysisRun, AnalysisRunRepositoryError>;
}

/** Effect service key supplied by the server's Analysis infrastructure Layer. */
export const AnalysisRunRepositoryTag =
  Context.GenericTag<AnalysisRunRepository>(
    '@omoikane/application/analysis/AnalysisRunRepository'
  );
