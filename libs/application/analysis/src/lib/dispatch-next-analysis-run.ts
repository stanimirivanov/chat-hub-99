import { Effect, Option } from 'effect';
import type { AnalysisRunDispatchError } from './analysis-run-error';
import {
  AnalysisRunRepositoryTag,
  type AnalysisRunRepository,
} from './analysis-run-repository';
import type { AnalysisJob } from './analysis-job';
import {
  decodeDispatcherId,
  readInputProperty,
} from './decode-analysis-run-request';

const OUTBOX_LEASE_SECONDS = 30;

export interface DispatchNextAnalysisRunInput {
  readonly dispatcherId: unknown;
}

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
    const dispatcherId = yield* decodeDispatcherId(
      readInputProperty(input, 'dispatcherId')
    );
    const repository = yield* AnalysisRunRepositoryTag;
    const claim = yield* repository.claimNextOutboxEvent({
      dispatcherId,
      leaseSeconds: OUTBOX_LEASE_SECONDS,
    });

    if (Option.isNone(claim)) {
      return Option.none();
    }

    return Option.some(yield* repository.dispatchOutboxEvent(claim.value));
  });
