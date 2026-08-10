import { Effect, Option } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import type { PostgrestError } from '@supabase/supabase-js';
import type { AnalysisRunOutboxClaim } from '@omoikane/application/analysis';
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
  claimNextOutboxEvent: vi.fn().mockResolvedValue({ data: [], error: null }),
  dispatchOutboxEvent: vi.fn().mockResolvedValue({ data: [], error: null }),
  ...overrides,
});

const command = {
  identity: { userId: row.requested_by },
  workspaceId: row.workspace_id,
  traceContext: {
    traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
    tracestate: 'omoikane=test',
  },
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
      p_traceparent: command.traceContext.traceparent,
      p_tracestate: command.traceContext.tracestate,
    });
  });

  it('omits absent tracestate so the RPC applies its null default', async () => {
    const start = vi.fn().mockResolvedValue({ data: [row], error: null });
    const repository = makeSupabaseAnalysisRunRepository(client({ start }));

    await Effect.runPromise(
      repository.start({
        ...command,
        traceContext: { ...command.traceContext, tracestate: null },
      })
    );

    expect(start).toHaveBeenCalledExactlyOnceWith({
      p_workspace_id: row.workspace_id,
      p_requested_by: row.requested_by,
      p_traceparent: command.traceContext.traceparent,
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

  it('maps an outbox claim and dispatches it with its fencing token', async () => {
    const outboxRow = {
      analysis_run_outbox_event_id: '40000000-0000-4000-8000-000000000001',
      claim_token: '50000000-0000-4000-8000-000000000001',
    };
    const jobRow = {
      analysis_job_id: '60000000-0000-4000-8000-000000000001',
      analysis_run_id: row.analysis_run_id,
      workspace_id: row.workspace_id,
      job_kind: 'analysis.execute',
      job_version: 1,
      available_at: '2026-08-10T12:00:00.000Z',
    };
    const claimNextOutboxEvent = vi
      .fn()
      .mockResolvedValue({ data: [outboxRow], error: null });
    const dispatchOutboxEvent = vi
      .fn()
      .mockResolvedValue({ data: [jobRow], error: null });
    const repository = makeSupabaseAnalysisRunRepository(
      client({ claimNextOutboxEvent, dispatchOutboxEvent })
    );

    const claim = await Effect.runPromise(
      repository.claimNextOutboxEvent({
        dispatcherId: 'dispatcher-1',
        leaseSeconds: 30,
      })
    );
    expect(Option.isSome(claim)).toBe(true);
    if (Option.isNone(claim)) {
      throw new Error('Expected an outbox claim.');
    }

    await expect(
      Effect.runPromise(repository.dispatchOutboxEvent(claim.value))
    ).resolves.toMatchObject({
      id: jobRow.analysis_job_id,
      kind: 'analysis.execute',
      version: 1,
    });
    expect(claimNextOutboxEvent).toHaveBeenCalledExactlyOnceWith({
      p_claimed_by: 'dispatcher-1',
      p_lease_seconds: 30,
    });
    expect(dispatchOutboxEvent).toHaveBeenCalledExactlyOnceWith({
      p_event_id: outboxRow.analysis_run_outbox_event_id,
      p_claim_token: outboxRow.claim_token,
    });
  });

  it('treats an empty claim result as normal unavailable work', async () => {
    const repository = makeSupabaseAnalysisRunRepository(client());
    const result = await Effect.runPromise(
      repository.claimNextOutboxEvent({
        dispatcherId: 'dispatcher-1',
        leaseSeconds: 30,
      })
    );

    expect(Option.isNone(result)).toBe(true);
  });

  it('maps a stale dispatch lease to a typed claim-lost failure', async () => {
    const error = { code: 'P0003' } as PostgrestError;
    const repository = makeSupabaseAnalysisRunRepository(
      client({
        dispatchOutboxEvent: vi.fn().mockResolvedValue({ data: null, error }),
      })
    );
    const result = await Effect.runPromise(
      repository
        .dispatchOutboxEvent({
          eventId: '40000000-0000-4000-8000-000000000001',
          claimToken: '50000000-0000-4000-8000-000000000001',
        } as AnalysisRunOutboxClaim)
        .pipe(Effect.either)
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: { _tag: 'AnalysisRunOutboxClaimLostError' },
    });
  });
});
