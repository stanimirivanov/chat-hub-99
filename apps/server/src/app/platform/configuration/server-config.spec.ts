import { describe, expect, it } from 'vitest';
import { InvalidServerConfigError, readServerConfig } from './server-config';

describe('readServerConfig', () => {
  it('provides deterministic local defaults', () => {
    expect(readServerConfig({})).toEqual({
      environment: 'local',
      host: '0.0.0.0',
      port: 3333,
      version: 'development',
      supabaseUrl: 'http://127.0.0.1:54321',
      supabaseAnonKey: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
      supabaseServiceRoleKey:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
      readinessTimeoutMilliseconds: 2000,
      allowedOrigins: ['http://localhost:4200'],
      telemetryEndpoint: null,
      telemetryShutdownTimeoutMilliseconds: 3000,
    });
  });

  it('trims and decodes configured values', () => {
    expect(
      readServerConfig({
        OMOIKANE_ENV: ' test ',
        OMOIKANE_SERVER_HOST: ' 127.0.0.1 ',
        OMOIKANE_SERVER_PORT: ' 4333 ',
        OMOIKANE_SERVER_VERSION: ' 0.1.0-test ',
        SUPABASE_URL: ' http://supabase.test ',
        SUPABASE_ANON_KEY: ' publishable-test-key ',
        SUPABASE_SERVICE_ROLE_KEY: ' service-role-test-key ',
        OMOIKANE_READINESS_TIMEOUT_MS: ' 500 ',
        OMOIKANE_ALLOWED_ORIGINS:
          ' https://app.omoikane.test, http://localhost:4200 ',
        OTEL_EXPORTER_OTLP_ENDPOINT: ' http://collector.test:4318 ',
        OMOIKANE_TELEMETRY_SHUTDOWN_TIMEOUT_MS: ' 750 ',
      })
    ).toEqual({
      environment: 'test',
      host: '127.0.0.1',
      port: 4333,
      version: '0.1.0-test',
      supabaseUrl: 'http://supabase.test',
      supabaseAnonKey: 'publishable-test-key',
      supabaseServiceRoleKey: 'service-role-test-key',
      readinessTimeoutMilliseconds: 500,
      allowedOrigins: ['https://app.omoikane.test', 'http://localhost:4200'],
      telemetryEndpoint: 'http://collector.test:4318',
      telemetryShutdownTimeoutMilliseconds: 750,
    });
  });

  it.each(['not-a-port', '0', '65536', '3.5'])(
    'rejects an invalid port: %s',
    (port) => {
      expect(() => readServerConfig({ OMOIKANE_SERVER_PORT: port })).toThrow(
        InvalidServerConfigError
      );
    }
  );

  it.each(['99', '30001', '1.5'])(
    'rejects an invalid readiness timeout: %s',
    (timeout) => {
      expect(() =>
        readServerConfig({ OMOIKANE_READINESS_TIMEOUT_MS: timeout })
      ).toThrow(InvalidServerConfigError);
    }
  );

  it.each(['not-a-url', 'ftp://supabase.test'])(
    'rejects an invalid Supabase URL: %s',
    (url) => {
      expect(() => readServerConfig({ SUPABASE_URL: url })).toThrow(
        InvalidServerConfigError
      );
    }
  );

  it.each(['not-a-url', 'ftp://collector.test'])(
    'rejects an invalid telemetry endpoint: %s',
    (url) => {
      expect(() =>
        readServerConfig({ OTEL_EXPORTER_OTLP_ENDPOINT: url })
      ).toThrow(InvalidServerConfigError);
    }
  );
});
