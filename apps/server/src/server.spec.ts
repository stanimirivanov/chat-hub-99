import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Effect } from 'effect';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServerEffectRuntime } from './app/platform/effect-runtime/server-effect-runtime.service';
import { createServer } from './create-server';

describe('Omoikane server runtime', () => {
  let app: NestFastifyApplication | undefined;

  beforeEach(() => {
    vi.stubEnv('OMOIKANE_ENV', 'test');
    vi.stubEnv('OMOIKANE_SERVER_VERSION', '0.1.0-test');
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
    vi.unstubAllEnvs();
  });

  it('reports dependency-free process liveness', async () => {
    app = await createServer();

    const response = await app.inject({
      method: 'GET',
      url: '/health/live',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'ok',
      service: 'omoikane-server',
      version: '0.1.0-test',
    });
  });

  it('publishes the liveness contract in OpenAPI', async () => {
    app = await createServer();

    const response = await app.inject({
      method: 'GET',
      url: '/openapi.json',
    });
    const document = response.json<{
      readonly info: { readonly title: string };
      readonly paths: Readonly<Record<string, unknown>>;
    }>();

    expect(response.statusCode).toBe(200);
    expect(document.info.title).toBe('Omoikane Server API');
    expect(document.paths).toHaveProperty('/health/live');
  });

  it('initializes one Effect runtime and disposes it with Nest', async () => {
    app = await createServer();
    const runtime = app.get(ServerEffectRuntime);
    const dispose = vi.spyOn(runtime, 'dispose');

    await expect(runtime.runPromise(Effect.succeed('ready'))).resolves.toBe(
      'ready'
    );

    await app.close();
    app = undefined;

    expect(dispose).toHaveBeenCalledOnce();
  });
});
