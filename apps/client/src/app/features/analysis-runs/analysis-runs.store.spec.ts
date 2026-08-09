import { TestBed } from '@angular/core/testing';
import { Either, Schema } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { AnalysisRunSchema, type AnalysisRun } from '@omoikane/domain/analysis';
import { WorkspaceIdSchema } from '@omoikane/domain/workspace';
import { AnalysisRunApiService } from '@client/core/analysis-run/analysis-run-api.service';
import { AnalysisRunsStore } from './analysis-runs.store';

const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  '20000000-0000-4000-8000-000000000001'
);
const run: AnalysisRun = Schema.decodeUnknownSync(AnalysisRunSchema)({
  id: '30000000-0000-4000-8000-000000000001',
  workspaceId,
  requestedBy: '10000000-0000-4000-8000-000000000001',
  status: 'created',
  createdAt: new Date('2026-08-09T12:00:00.000Z'),
});

const configureStore = () => {
  const start = vi.fn().mockResolvedValue(Either.right(run));
  const get = vi.fn().mockResolvedValue(Either.right(run));
  TestBed.configureTestingModule({
    providers: [
      AnalysisRunsStore,
      { provide: AnalysisRunApiService, useValue: { start, get } },
    ],
  });
  return { store: TestBed.inject(AnalysisRunsStore), start, get };
};

describe('AnalysisRunsStore', () => {
  it('starts and retains the canonical run for the selected workspace', async () => {
    const { store, start } = configureStore();
    store.selectWorkspace(workspaceId);

    await expect(store.start()).resolves.toBe(true);

    expect(start).toHaveBeenCalledExactlyOnceWith(workspaceId);
    expect(store.run()).toEqual(run);
    expect(store.status()).toBe('created');
  });

  it('refreshes the retained run through the observe endpoint', async () => {
    const { store, get } = configureStore();
    store.selectWorkspace(workspaceId);
    await store.start();

    await expect(store.refresh()).resolves.toBe(true);

    expect(get).toHaveBeenCalledExactlyOnceWith(workspaceId, run.id);
  });

  it('clears a run when workspace selection changes', async () => {
    const { store } = configureStore();
    store.selectWorkspace(workspaceId);
    await store.start();

    store.selectWorkspace(
      Schema.decodeUnknownSync(WorkspaceIdSchema)(
        '20000000-0000-4000-8000-000000000002'
      )
    );

    expect(store.run()).toBeNull();
    expect(store.status()).toBe('idle');
  });

  it('does not start another run while a refresh is in progress', async () => {
    const { store, start, get } = configureStore();
    store.selectWorkspace(workspaceId);
    await store.start();

    let completeRefresh:
      | ((value: Either.Either<AnalysisRun, never>) => void)
      | null = null;
    get.mockReturnValueOnce(
      new Promise((resolve) => {
        completeRefresh = resolve;
      })
    );

    const refreshing = store.refresh();

    await expect(store.start()).resolves.toBe(false);
    expect(start).toHaveBeenCalledTimes(1);

    if (completeRefresh === null) {
      throw new Error('Expected the refresh request to be pending.');
    }
    completeRefresh(Either.right(run));
    await expect(refreshing).resolves.toBe(true);
  });
});
