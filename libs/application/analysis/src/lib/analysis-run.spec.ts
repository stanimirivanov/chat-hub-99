import { Effect, Layer } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import type { AnalysisRun } from '@omoikane/domain/analysis';
import {
  AnalysisRunRepositoryTag,
  type AnalysisRunRepository,
} from './analysis-run-repository';
import { getAnalysisRun } from './get-analysis-run';
import { startAnalysisRun } from './start-analysis-run';

const run = {
  id: '30000000-0000-4000-8000-000000000001',
  workspaceId: '20000000-0000-4000-8000-000000000001',
  requestedBy: '10000000-0000-4000-8000-000000000001',
  status: 'created',
  createdAt: new Date('2026-08-09T12:00:00.000Z'),
} as AnalysisRun;

const layer = (repository: AnalysisRunRepository) =>
  Layer.succeed(AnalysisRunRepositoryTag, repository);

describe('Analysis Run use cases', () => {
  it('starts a run with validated explicit identity and workspace scope', async () => {
    const start = vi.fn(() => Effect.succeed(run));
    const repository: AnalysisRunRepository = {
      start,
      get: () => Effect.die('unexpected get'),
    };

    await expect(
      Effect.runPromise(
        startAnalysisRun({
          identity: { userId: run.requestedBy },
          workspaceId: run.workspaceId,
        }).pipe(Effect.provide(layer(repository)))
      )
    ).resolves.toBe(run);
    expect(start).toHaveBeenCalledOnce();
  });

  it('rejects malformed input before repository access', async () => {
    const start = vi.fn(() => Effect.succeed(run));
    const repository: AnalysisRunRepository = {
      start,
      get: () => Effect.die('unexpected get'),
    };
    const result = await Effect.runPromise(
      startAnalysisRun({ identity: null, workspaceId: '' }).pipe(
        Effect.provide(layer(repository)),
        Effect.either
      )
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: { _tag: 'InvalidAnalysisRunInputError' },
    });
    expect(start).not.toHaveBeenCalled();
  });

  it('gets a run through the same explicit scope', async () => {
    const get = vi.fn(() => Effect.succeed(run));
    const repository: AnalysisRunRepository = {
      start: () => Effect.die('unexpected start'),
      get,
    };

    await Effect.runPromise(
      getAnalysisRun({
        identity: { userId: run.requestedBy },
        workspaceId: run.workspaceId,
        analysisRunId: run.id,
      }).pipe(Effect.provide(layer(repository)))
    );
    expect(get).toHaveBeenCalledOnce();
  });
});
