import { createServer, type Server } from 'node:http';
import type { WorkerConfig } from '../config/worker-config';
import type { AnalysisWorkerRuntime } from '../runtime/analysis-worker-runtime';

const writeJson = (
  response: import('node:http').ServerResponse,
  statusCode: number,
  body: Readonly<Record<string, string>>
): void => {
  response.writeHead(statusCode, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
};

/** Dependency-free health transport owned by the worker process boundary. */
export const createWorkerHealthServer = (
  config: WorkerConfig,
  runtime: AnalysisWorkerRuntime
): Server =>
  createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/health/live') {
      writeJson(response, runtime.isLive() ? 200 : 503, {
        status: runtime.isLive() ? 'live' : 'stopping',
      });
      return;
    }

    if (request.method === 'GET' && request.url === '/health/ready') {
      void runtime
        .checkReady()
        .then((ready) =>
          writeJson(response, ready && runtime.isInitialized() ? 200 : 503, {
            status: ready && runtime.isInitialized() ? 'ready' : 'not_ready',
          })
        )
        .catch(() => writeJson(response, 503, { status: 'not_ready' }));
      return;
    }

    writeJson(response, 404, { status: 'not_found' });
  });

export const listenWorkerHealthServer = (
  server: Server,
  config: WorkerConfig
): Promise<void> =>
  new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, config.host, () => {
      server.off('error', reject);
      resolve();
    });
  });

export const closeWorkerHealthServer = (server: Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
