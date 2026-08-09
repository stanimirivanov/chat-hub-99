import { Effect } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import type { PostgrestError } from '@supabase/supabase-js';
import type { SupabaseAnalysisClient } from './supabase-analysis-client';
import { makeSupabaseAnalysisRunRepository } from './supabase-analysis-run-repository';

const row = {
  analysis_run_id: '30000000-0000-4000-8000-000000000001',
  workspace_id: '20000000-0000-4000-8000-000000000001',
  requested_by: '10000000-0000-4000-8000-000000000001',
  status: 'created',
  created_at: '2026-08-09T12:00:00.000Z',
};

const client = (
  overrides: Partial<SupabaseAnalysisClient> = {}
): SupabaseAnalysisClient => ({
  start: vi.fn().mockResolvedValue({ data: [row], error: null }),
  get: vi.fn().mockResolvedValue({ data: [row], error: null }),
  ...overrides,
});

const command = {
  identity: { userId: row.requested_by },
  workspaceId: row.workspace_id,
} as Parameters<
  ReturnType<typeof makeSupabaseAnalysisRunRepository>['start']
>[0];

describe('makeSupabaseAnalysisRunRepository', () => {
  it('maps the canonical start result', async () => {
    const start = vi.fn().mockResolvedValue({ data: [row], error: null });
    const repository = makeSupabaseAnalysisRunRepository(client({ start }));

    await expect(
      Effect.runPromise(repository.start(command))
    ).resolves.toMatchObject({
      id: row.analysis_run_id,
      status: 'created',
    });
    expect(start).toHaveBeenCalledExactlyOnceWith({
      p_workspace_id: row.workspace_id,
      p_requested_by: row.requested_by,
    });
  });

  it('maps the deliberately indistinguishable inaccessible signal', async () => {
    const error = { code: 'P0002' } as PostgrestError;
    const repository = makeSupabaseAnalysisRunRepository(
      client({ start: vi.fn().mockResolvedValue({ data: null, error }) })
    );
    const result = await Effect.runPromise(
      repository.start(command).pipe(Effect.either)
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: { _tag: 'AnalysisRunNotAccessibleError' },
    });
  });

  it('rejects malformed provider rows', async () => {
    const repository = makeSupabaseAnalysisRunRepository(
      client({
        start: vi.fn().mockResolvedValue({
          data: [{ ...row, status: 'completed' }],
          error: null,
        }),
      })
    );
    const result = await Effect.runPromise(
      repository.start(command).pipe(Effect.either)
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: { _tag: 'InvalidAnalysisRunDataError' },
    });
  });
});
