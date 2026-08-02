import { Effect, Either } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { makeSupabaseAuthenticationService } from './supabase-authentication-service';
import {
  accountAlreadyRegisteredError,
  authenticationSession,
  invalidCredentialsError,
  makeSupabaseAuthenticationClientStub,
  passwordResetRateLimitError,
  weakPasswordError,
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

  it('registers an account and maps its immediate session', async () => {
    const signUp = vi.fn().mockResolvedValue({
      data: {
        user: authenticationSession.user,
        session: authenticationSession,
      },
      error: null,
    });
    const service = makeSupabaseAuthenticationService(
      makeSupabaseAuthenticationClientStub({ signUp })
    );

    const result = await Effect.runPromise(
      service.signUp({
        email: 'new-user@example.com',
        password: 'Password123!',
      })
    );

    expect(result).toEqual({
      status: 'authenticated',
      session: {
        userId: '00000000-0000-4000-8000-000000000001',
        email: 'owner@chat-hub.local',
      },
    });
    expect(signUp).toHaveBeenCalledExactlyOnceWith({
      email: 'new-user@example.com',
      password: 'Password123!',
    });
  });

  it('preserves email-confirmation registration as an explicit outcome', async () => {
    const service = makeSupabaseAuthenticationService(
      makeSupabaseAuthenticationClientStub({
        signUp: vi.fn().mockResolvedValue({
          data: {
            user: authenticationSession.user,
            session: null,
          },
          error: null,
        }),
      })
    );

    await expect(
      Effect.runPromise(
        service.signUp({
          email: 'new-user@example.com',
          password: 'Password123!',
        })
      )
    ).resolves.toEqual({ status: 'confirmation-required' });
  });

  it('maps an already registered account', async () => {
    const service = makeSupabaseAuthenticationService(
      makeSupabaseAuthenticationClientStub({
        signUp: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: accountAlreadyRegisteredError,
        }),
      })
    );

    const result = await Effect.runPromise(
      service
        .signUp({
          email: 'owner@chat-hub.local',
          password: 'Password123!',
        })
        .pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'AccountAlreadyRegisteredError',
      });
    }
  });

  it('rejects a successful provider response without a user or session', async () => {
    const service = makeSupabaseAuthenticationService(
      makeSupabaseAuthenticationClientStub({
        signUp: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: null,
        }),
      })
    );

    const result = await Effect.runPromise(
      service
        .signUp({
          email: 'new-user@example.com',
          password: 'Password123!',
        })
        .pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'AuthenticationUnavailableError',
        operation: 'sign-up',
      });
    }
  });

  it('requests a password-reset email with its callback URL', async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({
      data: {},
      error: null,
    });
    const service = makeSupabaseAuthenticationService(
      makeSupabaseAuthenticationClientStub({ resetPasswordForEmail })
    );

    await Effect.runPromise(
      service.requestPasswordReset({
        email: 'owner@example.com',
        redirectUrl: 'http://localhost:4200/',
      })
    );

    expect(resetPasswordForEmail).toHaveBeenCalledExactlyOnceWith(
      'owner@example.com',
      { redirectTo: 'http://localhost:4200/' }
    );
  });

  it('maps password-reset email rate limiting', async () => {
    const service = makeSupabaseAuthenticationService(
      makeSupabaseAuthenticationClientStub({
        resetPasswordForEmail: vi.fn().mockResolvedValue({
          data: null,
          error: passwordResetRateLimitError,
        }),
      })
    );

    const result = await Effect.runPromise(
      service
        .requestPasswordReset({
          email: 'owner@example.com',
          redirectUrl: 'http://localhost:4200/',
        })
        .pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('PasswordResetRateLimitedError');
    }
  });

  it('updates the recovery session password', async () => {
    const updateUser = vi.fn().mockResolvedValue({
      data: { user: authenticationSession.user },
      error: null,
    });
    const service = makeSupabaseAuthenticationService(
      makeSupabaseAuthenticationClientStub({ updateUser })
    );

    await Effect.runPromise(service.updatePassword('NewPassword123!'));

    expect(updateUser).toHaveBeenCalledExactlyOnceWith({
      password: 'NewPassword123!',
    });
  });

  it('maps a weak replacement password', async () => {
    const service = makeSupabaseAuthenticationService(
      makeSupabaseAuthenticationClientStub({
        updateUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: weakPasswordError,
        }),
      })
    );

    const result = await Effect.runPromise(
      service.updatePassword('weak').pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'InvalidPasswordUpdateInputError',
        field: 'password',
      });
    }
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
