import { Controller, Get, Module, Req } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getRequestIdentity,
  type RequestWithIdentity,
} from './app/platform/authentication/request-identity';
import { ServerModule } from './app/server.module';
import { createServer } from './create-server';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

@Controller('test/authenticated-entry')
class AuthenticatedEntryTestController {
  @Get()
  identity(@Req() request: RequestWithIdentity): unknown {
    return getRequestIdentity(request);
  }
}

@Module({
  imports: [ServerModule],
  controllers: [AuthenticatedEntryTestController],
})
class AuthenticationIntegrationModule {}

describe('authenticated server entry against local Supabase', () => {
  let app: NestFastifyApplication | undefined;

  beforeEach(() => {
    vi.stubEnv('OMOIKANE_ENV', 'integration');
    vi.stubEnv('SUPABASE_URL', supabaseUrl);
    vi.stubEnv('SUPABASE_ANON_KEY', supabaseAnonKey);
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
    vi.unstubAllEnvs();
  });

  it('accepts a local authenticated user and exposes only canonical identity', async () => {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const { data, error } = await client.auth.signInWithPassword({
      email: 'owner@omoikane.local',
      password: 'Password123!',
    });

    expect(error).toBeNull();
    expect(data.session?.access_token).toBeTruthy();

    app = await createServer(AuthenticationIntegrationModule);
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/test/authenticated-entry',
      headers: { authorization: `Bearer ${data.session?.access_token ?? ''}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.json()).toEqual({
      userId: '10000000-0000-4000-8000-000000000001',
    });
  });

  it('reports the active Supabase Auth dependency as ready', async () => {
    app = await createServer();

    const response = await app.inject({
      method: 'GET',
      url: '/health/ready',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'ok',
      checks: { supabaseAuth: 'ok' },
    });
  });
});
