import { describe, expect, it } from 'vitest';
import { InvalidServerConfigError, readServerConfig } from './server-config';

describe('readServerConfig', () => {
  it('provides deterministic local defaults', () => {
    expect(readServerConfig({})).toEqual({
      environment: 'local',
      host: '0.0.0.0',
      port: 3333,
      version: 'development',
    });
  });

  it('trims and decodes configured values', () => {
    expect(
      readServerConfig({
        OMOIKANE_ENV: ' test ',
        OMOIKANE_SERVER_HOST: ' 127.0.0.1 ',
        OMOIKANE_SERVER_PORT: ' 4333 ',
        OMOIKANE_SERVER_VERSION: ' 0.1.0-test ',
      })
    ).toEqual({
      environment: 'test',
      host: '127.0.0.1',
      port: 4333,
      version: '0.1.0-test',
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
});
