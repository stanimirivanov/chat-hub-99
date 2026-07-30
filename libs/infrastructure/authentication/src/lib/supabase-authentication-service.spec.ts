import type { AuthError, Session } from '@supabase/supabase-js';
import { Effect, Either } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseAuthenticationClient } from './supabase-authentication-client';
import { makeSupabaseAuthenticationService } from './supabase-authentication-service';

const session = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'owner@chat-hub.local',
  },
} as Session;

const invalidCredentials = {
  name: 'AuthApiError',
  message: 'Invalid credentials',
  status: 400,
  code: 'invalid_credentials',
} as AuthError;

const makeClient = (
  overrides: Partial<SupabaseAuthenticationClient['auth']> = {}
): SupabaseAuthenticationClient => ({
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    }),

    signInWithPassword: vi.fn().mockResolvedValue({
      data: {
        user: session.user,
        session,
      },
      error: null,
    }),

    signOut: vi.fn().mockResolvedValue({
      error: null,
    }),

    onAuthStateChange: vi.fn(() => ({
      data: {
        subscription: {
          id: 'auth-subscription',
          callback: vi.fn(),
          unsubscribe: vi.fn(),
        },
      },
    })),

    ...overrides,
  },
});

describe('makeSupabaseAuthenticationService', () => {
  it('restores no session', async () => {
    const client = makeClient();
    const service = makeSupabaseAuthenticationService(client);

    const result = await Effect.runPromise(service.getCurrentSession());

    expect(result).toBeNull();
    expect(client.auth.getSession).toHaveBeenCalledOnce();
  });

  it('restores an existing session', async () => {
    const client = makeClient({
      getSession: vi.fn().mockResolvedValue({
        data: {
          session,
        },
        error: null,
      }),
    });

    const service = makeSupabaseAuthenticationService(client);

    const result = await Effect.runPromise(service.getCurrentSession());

    expect(result).toEqual({
      userId: '00000000-0000-4000-8000-000000000001',
      email: 'owner@chat-hub.local',
    });
  });

  it('signs in with email and password', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: {
        user: session.user,
        session,
      },
      error: null,
    });

    const client = makeClient({
      signInWithPassword,
    });

    const service = makeSupabaseAuthenticationService(client);

    const result = await Effect.runPromise(
      service.signIn({
        email: 'owner@chat-hub.local',
        password: 'Password123!',
      })
    );

    expect(result).toEqual({
      userId: '00000000-0000-4000-8000-000000000001',
      email: 'owner@chat-hub.local',
    });

    expect(signInWithPassword).toHaveBeenCalledExactlyOnceWith({
      email: 'owner@chat-hub.local',
      password: 'Password123!',
    });
  });

  it('maps invalid credentials', async () => {
    const client = makeClient({
      signInWithPassword: vi.fn().mockResolvedValue({
        data: {
          user: null,
          session: null,
        },
        error: invalidCredentials,
      }),
    });

    const service = makeSupabaseAuthenticationService(client);

    const result = await Effect.runPromise(
      service
        .signIn({
          email: 'owner@chat-hub.local',
          password: 'wrong-password',
        })
        .pipe(Effect.either)
    );

    Either.match(result, {
      onLeft: (error) => {
        expect(error).toMatchObject({
          _tag: 'InvalidCredentialsError',
        });
      },
      onRight: () => {
        throw new Error('Expected sign-in to fail.');
      },
    });
  });

  it('signs out', async () => {
    const signOut = vi.fn().mockResolvedValue({
      error: null,
    });

    const client = makeClient({
      signOut,
    });

    const service = makeSupabaseAuthenticationService(client);

    await Effect.runPromise(service.signOut());

    expect(signOut).toHaveBeenCalledOnce();
  });
});
