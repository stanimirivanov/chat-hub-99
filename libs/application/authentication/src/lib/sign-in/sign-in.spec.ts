import { Effect, Either } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { InvalidCredentialsError } from '../authentication-error';
import type { AuthenticationService } from '../authentication-service';
import type { AuthenticationSession } from '../authentication-session';
import { makeAuthenticationServiceTestLayer } from '../testing/make-authentication-service-test-layer';
import { signIn } from './sign-in';

describe('signIn', () => {
  it('trims the email and delegates authentication', async () => {
    const session: AuthenticationSession = {
      userId: '00000000-0000-4000-8000-000000000001',
      email: 'owner@chat-hub.local',
    };

    const signInService: AuthenticationService['signIn'] = vi.fn(() =>
      Effect.succeed(session)
    );

    const { layer } = makeAuthenticationServiceTestLayer({
      signIn: signInService,
    });

    const result = await Effect.runPromise(
      signIn({
        email: '  owner@chat-hub.local  ',
        password: 'Password123!',
      }).pipe(Effect.provide(layer))
    );

    expect(result).toEqual(session);

    expect(signInService).toHaveBeenCalledExactlyOnceWith({
      email: 'owner@chat-hub.local',
      password: 'Password123!',
    });
  });

  it('passes the password unchanged', async () => {
    const session: AuthenticationSession = {
      userId: '00000000-0000-4000-8000-000000000001',
      email: 'owner@chat-hub.local',
    };

    const signInService: AuthenticationService['signIn'] = vi.fn(() =>
      Effect.succeed(session)
    );

    const { layer } = makeAuthenticationServiceTestLayer({
      signIn: signInService,
    });

    await Effect.runPromise(
      signIn({
        email: 'owner@chat-hub.local',
        password: '  Password123!  ',
      }).pipe(Effect.provide(layer))
    );

    expect(signInService).toHaveBeenCalledExactlyOnceWith({
      email: 'owner@chat-hub.local',
      password: '  Password123!  ',
    });
  });

  it('propagates invalid credentials unchanged', async () => {
    const failure = new InvalidCredentialsError();

    const signInService: AuthenticationService['signIn'] = vi.fn(() =>
      Effect.fail(failure)
    );

    const { layer } = makeAuthenticationServiceTestLayer({
      signIn: signInService,
    });

    const result = await Effect.runPromise(
      signIn({
        email: 'owner@chat-hub.local',
        password: 'wrong-password',
      }).pipe(Effect.provide(layer), Effect.either)
    );

    Either.match(result, {
      onLeft: (error) => {
        expect(error).toBe(failure);
      },
      onRight: () => {
        throw new Error('Expected sign-in to fail.');
      },
    });
  });
});
