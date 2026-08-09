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
        createdAt: new Date('2026-08-09T12:00:00.000Z'),
      })
    ).toMatchObject({ status: 'created' });
  });

  it('rejects execution states not implemented by this slice', () => {
    expect(() =>
      decode({
        id: '30000000-0000-4000-8000-000000000001',
        workspaceId: '20000000-0000-4000-8000-000000000001',
        requestedBy: '10000000-0000-4000-8000-000000000001',
        status: 'completed',
        createdAt: new Date(),
      })
    ).toThrow();
  });
});
