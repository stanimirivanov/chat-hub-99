import {
  ROOT_CONTEXT,
  trace,
  type Counter,
  type Histogram,
  type TextMapGetter,
  type Tracer,
} from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  MeterProvider,
  PeriodicExportingMetricReader,
  type MetricReader,
} from '@opentelemetry/sdk-metrics';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import {
  BatchSpanProcessor,
  type SpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import * as EffectOtelTracer from '@effect/opentelemetry/Tracer';
import { Effect, Layer } from 'effect';
import type { AnalysisRunProcessingTraceContext } from '@omoikane/application/analysis';
import type { WorkerConfig } from '../config/worker-config';

const carrierGetter: TextMapGetter<Record<string, string>> = {
  keys: (carrier) => Object.keys(carrier),
  get: (carrier, key) => carrier[key],
};

const signalUrl = (endpoint: string, signal: 'traces' | 'metrics'): string =>
  `${endpoint.replace(/\/+$/u, '')}/v1/${signal}`;

/** Owns worker trace continuation, bounded metrics, and telemetry disposal. */
export class WorkerTelemetry {
  readonly effectLayer: Layer.Layer<never>;

  private readonly tracerProvider: NodeTracerProvider;
  private readonly meterProvider: MeterProvider;
  private readonly tracer: Tracer;
  private readonly dispatchCount: Counter;
  private readonly acquisitionCount: Counter;
  private readonly attemptDuration: Histogram;
  private shutdownStarted = false;

  constructor(private readonly config: WorkerConfig) {
    const spanProcessors: SpanProcessor[] = [];
    const metricReaders: MetricReader[] = [];
    if (config.telemetryEndpoint !== null) {
      spanProcessors.push(
        new BatchSpanProcessor(
          new OTLPTraceExporter({
            url: signalUrl(config.telemetryEndpoint, 'traces'),
          })
        )
      );
      metricReaders.push(
        new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
            url: signalUrl(config.telemetryEndpoint, 'metrics'),
          }),
          exportIntervalMillis: 60_000,
          exportTimeoutMillis: 10_000,
          cardinalityLimits: { default: 200 },
        })
      );
    }

    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'omoikane-ai-worker',
      [ATTR_SERVICE_VERSION]: config.version,
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: config.environment,
    });
    this.tracerProvider = new NodeTracerProvider({
      resource,
      spanProcessors,
    });
    this.meterProvider = new MeterProvider({
      resource,
      readers: metricReaders,
    });
    this.tracer = this.tracerProvider.getTracer(
      'omoikane-ai-worker',
      config.version
    );
    const meter = this.meterProvider.getMeter(
      'omoikane-ai-worker',
      config.version
    );
    this.dispatchCount = meter.createCounter('analysis.outbox.dispatch.count');
    this.acquisitionCount = meter.createCounter(
      'analysis.job.acquisition.count'
    );
    this.attemptDuration = meter.createHistogram(
      'analysis.job.attempt.duration',
      { unit: 's' }
    );

    const tracerLayer = Layer.succeed(EffectOtelTracer.OtelTracer, this.tracer);
    this.effectLayer = EffectOtelTracer.layerWithoutOtelTracer.pipe(
      Layer.provide(tracerLayer)
    );
  }

  /** Continues the server-created trace without relying on ambient context. */
  continueTrace<A, E, R>(
    program: Effect.Effect<A, E, R>,
    carrier: AnalysisRunProcessingTraceContext
  ): Effect.Effect<A, E, R> {
    const parent = new W3CTraceContextPropagator().extract(
      ROOT_CONTEXT,
      {
        traceparent: carrier.traceparent,
        ...(carrier.tracestate === null
          ? {}
          : { tracestate: carrier.tracestate }),
      },
      carrierGetter
    );
    const spanContext = trace.getSpanContext(parent);
    return spanContext === undefined
      ? program
      : program.pipe(EffectOtelTracer.withSpanContext(spanContext));
  }

  recordDispatch(failed: boolean): void {
    this.dispatchCount.add(1, {
      'job.kind': 'analysis.execute',
      outcome: failed ? 'failed' : 'succeeded',
    });
  }

  recordAcquisition(acquired: boolean): void {
    this.acquisitionCount.add(1, {
      'job.kind': 'analysis.execute',
      outcome: acquired ? 'acquired' : 'idle',
    });
  }

  recordAttempt(durationMilliseconds: number, failed: boolean): void {
    this.attemptDuration.record(durationMilliseconds / 1000, {
      'job.kind': 'analysis.execute',
      outcome: failed ? 'failed' : 'succeeded',
    });
  }

  log(
    level: 'info' | 'error',
    message: string,
    fields: Readonly<Record<string, string | number>> = {}
  ): void {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        'service.name': 'omoikane-ai-worker',
        'service.version': this.config.version,
        'deployment.environment': this.config.environment,
        message,
        ...fields,
      })
    );
  }

  async shutdown(): Promise<void> {
    if (this.shutdownStarted) {
      return;
    }
    this.shutdownStarted = true;
    const timeoutMilliseconds =
      this.config.telemetryShutdownTimeoutMilliseconds;
    const closing = Promise.allSettled([
      this.tracerProvider.forceFlush(),
      this.meterProvider.forceFlush({ timeoutMillis: timeoutMilliseconds }),
    ]).then(() =>
      Promise.allSettled([
        this.tracerProvider.shutdown(),
        this.meterProvider.shutdown({ timeoutMillis: timeoutMilliseconds }),
      ])
    );
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        closing,
        new Promise<void>((resolve) => {
          timeout = setTimeout(resolve, timeoutMilliseconds);
        }),
      ]);
    } finally {
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
    }
  }
}
