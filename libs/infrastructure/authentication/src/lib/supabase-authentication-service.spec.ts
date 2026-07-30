import { Effect, Either } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { makeSupabaseAuthenticationService } from './supabase-authentication-service';
import {
  authenticationSession,
  invalidCredentialsError,
  makeSupabaseAuthenticationClientStub,
} from './testing';

describe('makeSupabaseAuthenticationService', () => {
  it('restores no session', async () => {
    const client = makeSupabaseAuthenticationClientStub();
    const service = makeSupabaseAuthenticationService(client);

    const result = await Effect.runPromise(service.getCurrentSession());

    expect(result).toBeNull();
    expect(client.auth.getSession).toHaveBeenCalledOnce();
  });

  it('restores an existing session', async () => {
    const client = makeSupabaseAuthenticationClientStub({
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: authenticationSession,
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
        user: authenticationSession.user,
        session: authenticationSession,
      },
      error: null,
    });

    const client = makeSupabaseAuthenticationClientStub({
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
    const client = makeSupabaseAuthenticationClientStub({
      signInWithPassword: vi.fn().mockResolvedValue({
        data: {
          user: null,
          session: null,
        },
        error: invalidCredentialsError,
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

    const client = makeSupabaseAuthenticationClientStub({
      signOut,
    });

    const service = makeSupabaseAuthenticationService(client);

    await Effect.runPromise(service.signOut());

    expect(signOut).toHaveBeenCalledOnce();
  });
});
