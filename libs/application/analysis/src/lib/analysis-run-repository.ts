import { Context, type Effect, type Option } from 'effect';
import type { AuthenticatedRequestIdentity } from '@omoikane/application/authentication';
import type { AnalysisRun, AnalysisRunId } from '@omoikane/domain/analysis';
import type { WorkspaceId } from '@omoikane/domain/workspace';
import type {
  AnalysisRunDispatchRepositoryError,
  AnalysisRunRepositoryError,
} from './analysis-run-error';
import type { AnalysisJob, AnalysisRunOutboxClaim } from './analysis-job';

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

export interface ClaimAnalysisRunOutboxCommand {
  readonly dispatcherId: string;
  readonly leaseSeconds: number;
}

/** Capability-oriented persistence boundary for runs and durable dispatch. */
export interface AnalysisRunRepository {
  readonly start: (
    command: StartAnalysisRunCommand
  ) => Effect.Effect<AnalysisRun, AnalysisRunRepositoryError>;
  readonly get: (
    query: GetAnalysisRunQuery
  ) => Effect.Effect<AnalysisRun, AnalysisRunRepositoryError>;
  readonly claimNextOutboxEvent: (
    command: ClaimAnalysisRunOutboxCommand
  ) => Effect.Effect<
    Option.Option<AnalysisRunOutboxClaim>,
    AnalysisRunDispatchRepositoryError
  >;
  readonly dispatchOutboxEvent: (
    claim: AnalysisRunOutboxClaim
  ) => Effect.Effect<AnalysisJob, AnalysisRunDispatchRepositoryError>;
}

/** Effect service key supplied by the server's Analysis infrastructure Layer. */
export const AnalysisRunRepositoryTag =
  Context.GenericTag<AnalysisRunRepository>(
    '@omoikane/application/analysis/AnalysisRunRepository'
  );
