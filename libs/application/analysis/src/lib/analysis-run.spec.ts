import { Effect, Layer, Option } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import type { AnalysisRun } from '@omoikane/domain/analysis';
import {
  AnalysisRunRepositoryTag,
  type AnalysisRunRepository,
} from './analysis-run-repository';
import type { AnalysisJob, AnalysisRunOutboxClaim } from './analysis-job';
import { getAnalysisRun } from './get-analysis-run';
import { startAnalysisRun } from './start-analysis-run';
import { dispatchNextAnalysisRun } from './dispatch-next-analysis-run';

const run = {
  id: '30000000-0000-4000-8000-000000000001',
  workspaceId: '20000000-0000-4000-8000-000000000001',
  requestedBy: '10000000-0000-4000-8000-000000000001',
  status: 'created',
  createdAt: new Date('2026-08-09T12:00:00.000Z'),
} as AnalysisRun;

const traceContext = {
  traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
  tracestate: 'omoikane=test',
};

const layer = (repository: AnalysisRunRepository) =>
  Layer.succeed(AnalysisRunRepositoryTag, repository);

const repository = (
  overrides: Partial<AnalysisRunRepository>
): AnalysisRunRepository => ({
  start: () => Effect.die('unexpected start'),
  get: () => Effect.die('unexpected get'),
  claimNextOutboxEvent: () => Effect.die('unexpected outbox claim'),
  dispatchOutboxEvent: () => Effect.die('unexpected outbox dispatch'),
  ...overrides,
});

describe('Analysis Run use cases', () => {
  it('starts a run with validated explicit identity and workspace scope', async () => {
    const start = vi.fn(() => Effect.succeed(run));
    const testRepository = repository({ start });

    await expect(
      Effect.runPromise(
        startAnalysisRun({
          identity: { userId: run.requestedBy },
          workspaceId: run.workspaceId,
          traceContext,
        }).pipe(Effect.provide(layer(testRepository)))
      )
    ).resolves.toBe(run);
    expect(start).toHaveBeenCalledOnce();
    expect(start).toHaveBeenCalledWith({
      identity: { userId: run.requestedBy },
      workspaceId: run.workspaceId,
      traceContext,
    });
  });

  it('rejects malformed input before repository access', async () => {
    const start = vi.fn(() => Effect.succeed(run));
    const testRepository = repository({ start });
    const result = await Effect.runPromise(
      startAnalysisRun({
        identity: null,
        workspaceId: '',
        traceContext: null,
      }).pipe(Effect.provide(layer(testRepository)), Effect.either)
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: { _tag: 'InvalidAnalysisRunInputError' },
    });
    expect(start).not.toHaveBeenCalled();
  });

  it('rejects malformed trace correlation before repository access', async () => {
    const start = vi.fn(() => Effect.succeed(run));
    const testRepository = repository({ start });
    const result = await Effect.runPromise(
      startAnalysisRun({
        identity: { userId: run.requestedBy },
        workspaceId: run.workspaceId,
        traceContext: {
          traceparent: 'not-a-traceparent',
          tracestate: null,
        },
      }).pipe(Effect.provide(layer(testRepository)), Effect.either)
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: {
        _tag: 'InvalidAnalysisRunInputError',
        field: 'traceContext',
      },
    });
    expect(start).not.toHaveBeenCalled();
  });

  it('gets a run through the same explicit scope', async () => {
    const get = vi.fn(() => Effect.succeed(run));
    const testRepository = repository({ get });

    await Effect.runPromise(
      getAnalysisRun({
        identity: { userId: run.requestedBy },
        workspaceId: run.workspaceId,
        analysisRunId: run.id,
      }).pipe(Effect.provide(layer(testRepository)))
    );
    expect(get).toHaveBeenCalledOnce();
  });

  it('claims and dispatches one available request', async () => {
    const claim = {
      eventId: '40000000-0000-4000-8000-000000000001',
      claimToken: '50000000-0000-4000-8000-000000000001',
    } as AnalysisRunOutboxClaim;
    const job = {
      id: '60000000-0000-4000-8000-000000000001',
      analysisRunId: run.id,
      workspaceId: run.workspaceId,
      kind: 'analysis.execute',
      version: 1,
      availableAt: new Date('2026-08-10T12:00:00.000Z'),
    } as AnalysisJob;
    const claimNextOutboxEvent = vi.fn(() =>
      Effect.succeed(Option.some(claim))
    );
    const dispatchOutboxEvent = vi.fn(() => Effect.succeed(job));

    const result = await Effect.runPromise(
      dispatchNextAnalysisRun({ dispatcherId: 'dispatcher-1' }).pipe(
        Effect.provide(
          layer(repository({ claimNextOutboxEvent, dispatchOutboxEvent }))
        )
      )
    );

    expect(result).toEqual(Option.some(job));
    expect(claimNextOutboxEvent).toHaveBeenCalledExactlyOnceWith({
      dispatcherId: 'dispatcher-1',
      leaseSeconds: 30,
    });
    expect(dispatchOutboxEvent).toHaveBeenCalledExactlyOnceWith(claim);
  });

  it('returns None without dispatching when no request is available', async () => {
    const dispatchOutboxEvent = vi.fn(() => Effect.die('unexpected dispatch'));
    const result = await Effect.runPromise(
      dispatchNextAnalysisRun({ dispatcherId: 'dispatcher-1' }).pipe(
        Effect.provide(
          layer(
            repository({
              claimNextOutboxEvent: () => Effect.succeed(Option.none()),
              dispatchOutboxEvent,
            })
          )
        )
      )
    );

    expect(Option.isNone(result)).toBe(true);
    expect(dispatchOutboxEvent).not.toHaveBeenCalled();
  });

  it('rejects an invalid dispatcher identity before repository access', async () => {
    const claimNextOutboxEvent = vi.fn(() => Effect.succeed(Option.none()));
    const result = await Effect.runPromise(
      dispatchNextAnalysisRun({ dispatcherId: '   ' }).pipe(
        Effect.provide(layer(repository({ claimNextOutboxEvent }))),
        Effect.either
      )
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: { _tag: 'InvalidAnalysisRunInputError', field: 'dispatcherId' },
    });
    expect(claimNextOutboxEvent).not.toHaveBeenCalled();
  });
});
