import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Controller, Get, Module, Req } from '@nestjs/common';
import { Effect } from 'effect';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServerEffectRuntime } from './app/platform/effect-runtime/server-effect-runtime.service';
import {
  getRequestIdentity,
  type RequestWithIdentity,
} from './app/platform/authentication/request-identity';
import { ServerModule } from './app/server.module';
import { createServer } from './create-server';

@Controller('test/protected')
class ProtectedTestController {
  @Get()
  getIdentity(@Req() request: RequestWithIdentity): unknown {
    return getRequestIdentity(request);
  }
}

@Module({ imports: [ServerModule], controllers: [ProtectedTestController] })
class ProtectedTestServerModule {}

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

  it.each([
    undefined,
    '',
    'Basic credentials',
    'Bearer',
    'Bearer token with-spaces',
  ])(
    'rejects a missing or malformed bearer header uniformly: %j',
    async (authorization) => {
      app = await createServer(ProtectedTestServerModule);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/test/protected',
        ...(authorization === undefined ? {} : { headers: { authorization } }),
      });

      expect(response.statusCode).toBe(401);
      expect(response.headers['www-authenticate']).toBe('Bearer');
      expect(response.headers['content-type']).toContain(
        'application/problem+json'
      );
      expect(response.json()).toMatchObject({
        type: 'https://omoikane.dev/problems/authentication-required',
        status: 401,
        code: 'authentication_required',
        instance: '/api/v1/test/protected',
      });
    }
  );
});
