import { Effect, Either } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { InvalidCredentialsError } from '../authentication-error';
import type { AuthenticationService } from '../authentication-service';
import {
  authenticationSession,
  makeAuthenticationServiceLayer,
  makeSignInAuthenticationService,
} from '../testing';
import { signIn, type SignInInput } from './sign-in';

/**
 * Simulates untyped JavaScript callers at the exported application boundary.
 */
const signInExternalInput = (input: unknown) => signIn(input as SignInInput);

describe('signIn', () => {
  it('trims the email and delegates authentication', async () => {
    const { signIn: signInService, serviceLayer } =
      makeSignInAuthenticationService(() =>
        Effect.succeed(authenticationSession)
      );

    const result = await Effect.runPromise(
      signIn({
        email: '  owner@omoikane.local  ',
        password: 'Password123!',
      }).pipe(Effect.provide(serviceLayer))
    );

    expect(result).toEqual(authenticationSession);

    expect(signInService).toHaveBeenCalledExactlyOnceWith({
      email: 'owner@omoikane.local',
      password: 'Password123!',
    });
  });

  it('passes the password unchanged', async () => {
    const signInService: AuthenticationService['signIn'] = vi.fn(() =>
      Effect.succeed(authenticationSession)
    );

    const layer = makeAuthenticationServiceLayer({
      signIn: signInService,
    });

    await Effect.runPromise(
      signIn({
        email: 'owner@omoikane.local',
        password: '  Password123!  ',
      }).pipe(Effect.provide(layer))
    );

    expect(signInService).toHaveBeenCalledExactlyOnceWith({
      email: 'owner@omoikane.local',
      password: '  Password123!  ',
    });
  });

  it('propagates invalid credentials unchanged', async () => {
    const failure = new InvalidCredentialsError();

    const signInService: AuthenticationService['signIn'] = vi.fn(() =>
      Effect.fail(failure)
    );

    const layer = makeAuthenticationServiceLayer({
      signIn: signInService,
    });

    const result = await Effect.runPromise(
      signIn({
        email: 'owner@omoikane.local',
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

  it.each([
    { email: '   ', password: 'Password123!', field: 'email' as const },
    { email: 'owner@omoikane.local', password: '', field: 'password' as const },
  ])(
    'rejects an empty $field before requesting the service',
    async ({ email, password, field }) => {
      const signInService: AuthenticationService['signIn'] = vi.fn(() =>
        Effect.succeed(authenticationSession)
      );

      const layer = makeAuthenticationServiceLayer({
        signIn: signInService,
      });

      const result = await Effect.runPromise(
        signIn({ email, password }).pipe(Effect.provide(layer), Effect.either)
      );

      expect(Either.isLeft(result)).toBe(true);

      if (Either.isLeft(result)) {
        expect(result.left).toMatchObject({
          _tag: 'InvalidSignInInputError',
          field,
        });
      }

      expect(signInService).not.toHaveBeenCalled();
    }
  );

  it.each([
    { input: undefined, field: 'email' as const },
    { input: null, field: 'email' as const },
    { input: {}, field: 'email' as const },
    {
      input: { email: null, password: 'Password123!' },
      field: 'email' as const,
    },
    {
      input: { email: 42, password: 'Password123!' },
      field: 'email' as const,
    },
    {
      input: { email: 'owner@omoikane.local', password: null },
      field: 'password' as const,
    },
    {
      input: { email: 'owner@omoikane.local', password: 42 },
      field: 'password' as const,
    },
  ])(
    'rejects malformed external input before requesting the service',
    async ({ input, field }) => {
      const signInService: AuthenticationService['signIn'] = vi.fn(() =>
        Effect.succeed(authenticationSession)
      );

      const layer = makeAuthenticationServiceLayer({
        signIn: signInService,
      });

      const result = await Effect.runPromise(
        signInExternalInput(input).pipe(Effect.provide(layer), Effect.either)
      );

      expect(Either.isLeft(result)).toBe(true);

      if (Either.isLeft(result)) {
        expect(result.left).toMatchObject({
          _tag: 'InvalidSignInInputError',
          field,
        });
      }

      expect(signInService).not.toHaveBeenCalled();
    }
  );
});
