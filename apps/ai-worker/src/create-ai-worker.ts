import type { Server } from 'node:http';
import { readWorkerConfig, type WorkerConfig } from './config/worker-config';
import {
  closeWorkerHealthServer,
  createWorkerHealthServer,
  listenWorkerHealthServer,
} from './health/worker-health-server';
import { AnalysisWorkerRuntime } from './runtime/analysis-worker-runtime';
import { WorkerTelemetry } from './telemetry/worker-telemetry';

export interface AiWorker {
  readonly config: WorkerConfig;
  readonly runtime: AnalysisWorkerRuntime;
  readonly healthServer: Server;
  start(): Promise<void>;
  stop(): Promise<void>;
}

/** Composes the worker runtime without leaking process-global configuration. */
export const createAiWorker = (
  environment: NodeJS.ProcessEnv = process.env
): AiWorker => {
  const config = readWorkerConfig(environment);
  const telemetry = new WorkerTelemetry(config);
  const runtime = new AnalysisWorkerRuntime(config, telemetry);
  const healthServer = createWorkerHealthServer(config, runtime);
  let started = false;

  return {
    config,
    runtime,
    healthServer,
    async start() {
      if (started) {
        return;
      }
      try {
        await runtime.initialize();
        await listenWorkerHealthServer(healthServer, config);
        runtime.start();
        started = true;
        telemetry.log('info', 'Omoikane AI worker started.', {
          port: config.port,
        });
      } catch (cause) {
        await runtime.stop();
        throw cause;
      }
    },
    async stop() {
      if (started) {
        await closeWorkerHealthServer(healthServer);
      }
      await runtime.stop();
      started = false;
    },
  };
};
