import { Context, type Effect } from 'effect';
import type { AuthenticatedRequestIdentity } from '@omoikane/application/authentication';
import type { AnalysisRun, AnalysisRunId } from '@omoikane/domain/analysis';
import type { WorkspaceId } from '@omoikane/domain/workspace';
import type { AnalysisRunRepositoryError } from './analysis-run-error';

export interface StartAnalysisRunCommand {
  readonly identity: AuthenticatedRequestIdentity;
  readonly workspaceId: WorkspaceId;
}

export interface GetAnalysisRunQuery extends StartAnalysisRunCommand {
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
