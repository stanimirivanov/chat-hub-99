import { afterEach, describe, expect, it } from 'vitest';
import type { AnalysisWorkerRuntime } from '../runtime/analysis-worker-runtime';
import type { WorkerConfig } from '../config/worker-config';
import {
  closeWorkerHealthServer,
  createWorkerHealthServer,
  listenWorkerHealthServer,
} from './worker-health-server';

const config = {
  host: '127.0.0.1',
  port: 0,
} as WorkerConfig;

const openServers: ReturnType<typeof createWorkerHealthServer>[] = [];

afterEach(async () => {
  await Promise.all(
    openServers.splice(0).map((server) => closeWorkerHealthServer(server))
  );
});

describe('worker health server', () => {
  it('keeps liveness dependency-free and readiness database-aware', async () => {
    const runtime = {
      isLive: () => true,
      isInitialized: () => true,
      checkReady: async () => true,
    } as AnalysisWorkerRuntime;
    const server = createWorkerHealthServer(config, runtime);
    openServers.push(server);
    await listenWorkerHealthServer(server, config);
    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('Expected a TCP health address.');
    }

    await expect(
      fetch(`http://127.0.0.1:${address.port}/health/live`).then((response) =>
        response.json()
      )
    ).resolves.toEqual({ status: 'live' });
    await expect(
      fetch(`http://127.0.0.1:${address.port}/health/ready`).then((response) =>
        response.json()
      )
    ).resolves.toEqual({ status: 'ready' });
  });
});
