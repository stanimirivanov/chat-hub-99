import { Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { AnalysisRunSchema } from './analysis-run';

const decode = Schema.decodeUnknownSync(AnalysisRunSchema);

describe('AnalysisRunSchema', () => {
  it('decodes the deterministic created state', () => {
    expect(
      decode({
        id: '30000000-0000-4000-8000-000000000001',
        workspaceId: '20000000-0000-4000-8000-000000000001',
        requestedBy: '10000000-0000-4000-8000-000000000001',
        status: 'created',
        failureCategory: null,
        createdAt: new Date('2026-08-09T12:00:00.000Z'),
      })
    ).toMatchObject({ status: 'created' });
  });

  it.each(['created', 'queued', 'running', 'succeeded'] as const)(
    'decodes the non-failed %s lifecycle projection',
    (status) => {
      expect(
        decode({
          id: '30000000-0000-4000-8000-000000000001',
          workspaceId: '20000000-0000-4000-8000-000000000001',
          requestedBy: '10000000-0000-4000-8000-000000000001',
          status,
          failureCategory: null,
          createdAt: new Date(),
        })
      ).toMatchObject({ status, failureCategory: null });
    }
  );

  it('decodes failed status with a bounded category', () => {
    expect(
      decode({
        id: '30000000-0000-4000-8000-000000000001',
        workspaceId: '20000000-0000-4000-8000-000000000001',
        requestedBy: '10000000-0000-4000-8000-000000000001',
        status: 'failed',
        failureCategory: 'provider.timeout',
        createdAt: new Date(),
      })
    ).toMatchObject({
      status: 'failed',
      failureCategory: 'provider.timeout',
    });
  });

  it('rejects unsupported execution states', () => {
    expect(() =>
      decode({
        id: '30000000-0000-4000-8000-000000000001',
        workspaceId: '20000000-0000-4000-8000-000000000001',
        requestedBy: '10000000-0000-4000-8000-000000000001',
        status: 'completed',
        failureCategory: null,
        createdAt: new Date(),
      })
    ).toThrow();
  });

  it('rejects failure information on a non-failed run', () => {
    expect(() =>
      decode({
        id: '30000000-0000-4000-8000-000000000001',
        workspaceId: '20000000-0000-4000-8000-000000000001',
        requestedBy: '10000000-0000-4000-8000-000000000001',
        status: 'running',
        failureCategory: 'provider.timeout',
        createdAt: new Date(),
      })
    ).toThrow();
  });
});
