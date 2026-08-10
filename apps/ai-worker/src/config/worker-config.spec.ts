import { describe, expect, it } from 'vitest';
import { InvalidWorkerConfigError, readWorkerConfig } from './worker-config';

describe('readWorkerConfig', () => {
  it('provides deterministic local runtime defaults', () => {
    expect(
      readWorkerConfig({ SUPABASE_SECRET_KEY: 'local-test-secret' })
    ).toMatchObject({
      environment: 'local',
      host: '0.0.0.0',
      port: 3334,
      pollIntervalMilliseconds: 1000,
      jobLeaseSeconds: 60,
    });
  });

  it('requires an explicit trusted Supabase key', () => {
    expect(() => readWorkerConfig({})).toThrow(InvalidWorkerConfigError);
  });

  it('rejects malformed bounded configuration', () => {
    expect(() =>
      readWorkerConfig({
        SUPABASE_SECRET_KEY: 'local-test-secret',
        OMOIKANE_AI_WORKER_JOB_LEASE_SECONDS: '301',
      })
    ).toThrow(InvalidWorkerConfigError);
  });
});
