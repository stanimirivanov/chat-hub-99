import { Inject, type Provider } from '@nestjs/common';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import {
  PeriodicExportingMetricReader,
  type MetricReader,
} from '@opentelemetry/sdk-metrics';
import {
  BatchSpanProcessor,
  type SpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { SERVER_CONFIG } from '../configuration/server-config.provider';
import type { ServerConfig } from '../configuration/server-config';

export const SERVER_TELEMETRY_SINKS = Symbol('SERVER_TELEMETRY_SINKS');

/** Export processors owned and closed by the server telemetry lifecycle. */
export interface ServerTelemetrySinks {
  readonly spanProcessors: ReadonlyArray<SpanProcessor>;
  readonly metricReaders: ReadonlyArray<MetricReader>;
}

const signalUrl = (endpoint: string, signal: 'traces' | 'metrics'): string =>
  `${endpoint.replace(/\/+$/u, '')}/v1/${signal}`;

/**
 * Creates optional OTLP/HTTP sinks from validated server configuration.
 *
 * With no endpoint, spans, metrics, request IDs, and structured logs remain
 * active in-process while export is disabled. Export availability therefore
 * never changes readiness.
 */
export const serverTelemetrySinksProvider: Provider<ServerTelemetrySinks> = {
  provide: SERVER_TELEMETRY_SINKS,
  inject: [SERVER_CONFIG],
  useFactory: (config: ServerConfig): ServerTelemetrySinks => {
    if (config.telemetryEndpoint === null) {
      return { spanProcessors: [], metricReaders: [] };
    }

    return {
      spanProcessors: [
        new BatchSpanProcessor(
          new OTLPTraceExporter({
            url: signalUrl(config.telemetryEndpoint, 'traces'),
          })
        ),
      ],
      metricReaders: [
        new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
            url: signalUrl(config.telemetryEndpoint, 'metrics'),
          }),
          exportIntervalMillis: 60_000,
          exportTimeoutMillis: 10_000,
          cardinalityLimits: { default: 200 },
        }),
      ],
    };
  },
};

/** Typed Nest injection decorator for the telemetry sink construction seam. */
export const InjectServerTelemetrySinks = () => Inject(SERVER_TELEMETRY_SINKS);
