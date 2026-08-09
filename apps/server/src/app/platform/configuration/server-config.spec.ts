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
      readinessTimeoutMilliseconds: 2000,
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
        OMOIKANE_READINESS_TIMEOUT_MS: ' 500 ',
      })
    ).toEqual({
      environment: 'test',
      host: '127.0.0.1',
      port: 4333,
      version: '0.1.0-test',
      supabaseUrl: 'http://supabase.test',
      supabaseAnonKey: 'publishable-test-key',
      readinessTimeoutMilliseconds: 500,
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
});
