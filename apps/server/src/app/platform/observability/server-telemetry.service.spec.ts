import * as EffectOtelTracer from '@effect/opentelemetry/Tracer';
import {
  AggregationTemporality,
  InMemoryMetricExporter,
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { Effect } from 'effect';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readServerConfig } from '../configuration/server-config';
import {
  ServerTelemetry,
  type TelemetryReply,
  type TelemetryRequest,
} from './server-telemetry.service';

const makeFixture = () => {
  const spanExporter = new InMemorySpanExporter();
  const metricExporter = new InMemoryMetricExporter(
    AggregationTemporality.CUMULATIVE
  );
  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 60_000,
  });
  const telemetry = new ServerTelemetry(
    readServerConfig({
      OMOIKANE_ENV: 'test',
      OMOIKANE_SERVER_VERSION: '0.1.0-test',
      OMOIKANE_TELEMETRY_SHUTDOWN_TIMEOUT_MS: '500',
      SUPABASE_SECRET_KEY: 'telemetry-test-secret',
    }),
    {
      spanProcessors: [new SimpleSpanProcessor(spanExporter)],
      metricReaders: [metricReader],
    }
  );

  return { telemetry, spanExporter, metricExporter };
};

describe('ServerTelemetry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('correlates an HTTP span with explicitly parented Effect dependency spans', async () => {
    const { telemetry, spanExporter, metricExporter } = makeFixture();
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const headers = new Map<string, string>();
    const request: TelemetryRequest = {
      method: 'POST',
      headers: {
        authorization: 'Bearer must-not-be-logged',
        traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
        'x-request-id': 'browser-request-1',
      },
    };
    const reply: TelemetryReply = {
      header: (name, value) => headers.set(name.toLowerCase(), value),
    };

    try {
      telemetry.beginRequest(request, reply);
      const parent = telemetry.requestSpanContext(request);
      if (parent === undefined) {
        throw new Error('Expected an active HTTP request span.');
      }
      expect(telemetry.processingTraceContext(request)).toMatchObject({
        traceparent: expect.stringContaining(
          '4bf92f3577b34da6a3ce929d0e0e4736'
        ),
        tracestate: null,
      });

      await Effect.runPromise(
        Effect.succeed('created').pipe(
          Effect.withSpan('supabase.analysis_run.start', { kind: 'client' }),
          EffectOtelTracer.withSpanContext(parent),
          Effect.provide(telemetry.effectLayer)
        )
      );
      telemetry.annotateAnalysisRun(
        request,
        '20000000-0000-4000-8000-000000000001',
        '30000000-0000-4000-8000-000000000001'
      );
      telemetry.recordOperation('analysis_run.start', 12, false);
      telemetry.finishRequest(
        request,
        201,
        '/api/v1/workspaces/:workspaceId/analysis-runs'
      );
      await telemetry.forceFlush();

      const spans = spanExporter.getFinishedSpans();
      const httpSpan = spans.find(
        (span) =>
          span.name === 'POST /api/v1/workspaces/:workspaceId/analysis-runs'
      );
      const dependencySpan = spans.find(
        (span) => span.name === 'supabase.analysis_run.start'
      );
      expect(httpSpan).toBeDefined();
      expect(dependencySpan).toBeDefined();
      expect(httpSpan?.spanContext().traceId).toBe(
        '4bf92f3577b34da6a3ce929d0e0e4736'
      );
      expect(dependencySpan?.spanContext().traceId).toBe(
        httpSpan?.spanContext().traceId
      );
      expect(dependencySpan?.parentSpanContext?.spanId).toBe(
        httpSpan?.spanContext().spanId
      );
      expect(headers.get('x-request-id')).toBe('browser-request-1');
      expect(headers.get('traceparent')).toContain(
        '4bf92f3577b34da6a3ce929d0e0e4736'
      );

      const record = JSON.parse(String(log.mock.calls.at(-1)?.[0])) as Record<
        string,
        unknown
      >;
      expect(record).toMatchObject({
        'request.id': 'browser-request-1',
        'trace.id': '4bf92f3577b34da6a3ce929d0e0e4736',
        'http.route': '/api/v1/workspaces/:workspaceId/analysis-runs',
        'http.response.status_code': 201,
        'workspace.id': '20000000-0000-4000-8000-000000000001',
        'analysis_run.id': '30000000-0000-4000-8000-000000000001',
      });
      expect(JSON.stringify(record)).not.toContain('must-not-be-logged');

      const metrics = metricExporter
        .getMetrics()
        .flatMap((resource) => resource.scopeMetrics)
        .flatMap((scope) => scope.metrics);
      expect(metrics.map((metric) => metric.descriptor.name)).toEqual(
        expect.arrayContaining([
          'http.server.request.count',
          'http.server.request.duration',
          'omoikane.server.operation.duration',
        ])
      );
      const metricAttributes = metrics.flatMap((metric) =>
        metric.dataPoints.map((point) => point.attributes)
      );
      expect(metricAttributes).not.toContainEqual(
        expect.objectContaining({ 'workspace.id': expect.anything() })
      );
    } finally {
      await telemetry.shutdown();
    }
  });

  it('replaces an unsafe propagated request identifier', async () => {
    const { telemetry } = makeFixture();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const headers = new Map<string, string>();
    const request: TelemetryRequest = {
      method: 'GET',
      headers: { 'x-request-id': 'contains spaces and\nnewlines' },
    };

    try {
      telemetry.beginRequest(request, {
        header: (name, value) => headers.set(name.toLowerCase(), value),
      });
      telemetry.finishRequest(request, 200, '/health/live');

      expect(headers.get('x-request-id')).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u
      );
    } finally {
      await telemetry.shutdown();
    }
  });
});
