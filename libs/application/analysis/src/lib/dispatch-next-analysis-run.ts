import { Effect, Option } from 'effect';
import type { AnalysisRunDispatchError } from './analysis-run-error';
import {
  AnalysisRunRepositoryTag,
  type AnalysisRunRepository,
} from './analysis-run-repository';
import type { AnalysisJob } from './analysis-job';
import type { AnalysisRunOutboxClaim } from './analysis-job';
import {
  decodeDispatcherId,
  readInputProperty,
} from './decode-analysis-run-request';

const OUTBOX_LEASE_SECONDS = 30;

export interface DispatchNextAnalysisRunInput {
  readonly dispatcherId: unknown;
}

export const claimNextAnalysisRunRequest = (
  input: unknown
): Effect.Effect<
  Option.Option<AnalysisRunOutboxClaim>,
  AnalysisRunDispatchError,
  AnalysisRunRepository
> =>
  Effect.gen(function* () {
    const dispatcherId = yield* decodeDispatcherId(
      readInputProperty(input, 'dispatcherId')
    );
    const repository = yield* AnalysisRunRepositoryTag;
    return yield* repository.claimNextOutboxEvent({
      dispatcherId,
      leaseSeconds: OUTBOX_LEASE_SECONDS,
    });
  });

export const dispatchClaimedAnalysisRunRequest = (
  claim: AnalysisRunOutboxClaim
): Effect.Effect<
  AnalysisJob,
  AnalysisRunDispatchError,
  AnalysisRunRepository
> =>
  Effect.flatMap(AnalysisRunRepositoryTag, (repository) =>
    repository.dispatchOutboxEvent(claim)
  );

/**
 * Claims and dispatches at most one available Analysis Run request.
 * `None` is normal when there is currently no work to dispatch.
 */
export const dispatchNextAnalysisRun = (
  input: unknown
): Effect.Effect<
  Option.Option<AnalysisJob>,
  AnalysisRunDispatchError,
  AnalysisRunRepository
> =>
  Effect.gen(function* () {
    const claim = yield* claimNextAnalysisRunRequest(input);

    if (Option.isNone(claim)) {
      return Option.none();
    }

    return Option.some(yield* dispatchClaimedAnalysisRunRequest(claim.value));
  });
