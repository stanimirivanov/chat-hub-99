import { Effect } from 'effect';
import type { AuthenticatedRequestIdentity } from '@omoikane/application/authentication';
import type { AnalysisRun } from '@omoikane/domain/analysis';
import type { AnalysisRunError } from './analysis-run-error';
import {
  AnalysisRunRepositoryTag,
  type AnalysisRunRepository,
} from './analysis-run-repository';
import {
  decodeAnalysisRunId,
  decodeStartRequest,
  readInputProperty,
} from './decode-analysis-run-request';

export interface GetAnalysisRunInput {
  readonly identity: AuthenticatedRequestIdentity;
  readonly workspaceId: unknown;
  readonly analysisRunId: unknown;
}

/** Validates scoped identities before observing one existing Analysis Run. */
export const getAnalysisRun = (
  input: unknown
): Effect.Effect<AnalysisRun, AnalysisRunError, AnalysisRunRepository> =>
  Effect.gen(function* () {
    const request = yield* decodeStartRequest(input);
    const analysisRunId = yield* decodeAnalysisRunId(
      readInputProperty(input, 'analysisRunId')
    );
    const repository = yield* AnalysisRunRepositoryTag;
    return yield* repository.get({ ...request, analysisRunId });
  });
