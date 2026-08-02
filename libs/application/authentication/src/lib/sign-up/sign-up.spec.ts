import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import { AccountAlreadyRegisteredError } from '../authentication-error';
import {
  authenticatedSignUpResult,
  confirmationRequiredSignUpResult,
  makeSignUpAuthenticationService,
} from '../testing';
import { signUp, type SignUpInput } from './sign-up';

/** Simulates untyped JavaScript callers at the exported boundary. */
const signUpExternalInput = (input: unknown) => signUp(input as SignUpInput);

describe('signUp', () => {
  it('normalizes the email and preserves the password', async () => {
    const { signUp: signUpService, serviceLayer } =
      makeSignUpAuthenticationService(() =>
        Effect.succeed(authenticatedSignUpResult)
      );

    const result = await Effect.runPromise(
      signUp({
        email: '  new-user@example.com  ',
        password: '  Password123!  ',
      }).pipe(Effect.provide(serviceLayer))
    );

    expect(result).toEqual(authenticatedSignUpResult);
    expect(signUpService).toHaveBeenCalledExactlyOnceWith({
      email: 'new-user@example.com',
      password: '  Password123!  ',
    });
  });

  it('preserves the confirmation-required outcome', async () => {
    const { serviceLayer } = makeSignUpAuthenticationService(() =>
      Effect.succeed(confirmationRequiredSignUpResult)
    );

    await expect(
      Effect.runPromise(
        signUp({
          email: 'new-user@example.com',
          password: 'Password123!',
        }).pipe(Effect.provide(serviceLayer))
      )
    ).resolves.toEqual(confirmationRequiredSignUpResult);
  });

  it('propagates provider-neutral registration failures unchanged', async () => {
    const failure = new AccountAlreadyRegisteredError();
    const { serviceLayer } = makeSignUpAuthenticationService(() =>
      Effect.fail(failure)
    );

    const result = await Effect.runPromise(
      signUp({
        email: 'existing@example.com',
        password: 'Password123!',
      }).pipe(Effect.provide(serviceLayer), Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBe(failure);
    }
  });

  it.each([
    { email: '   ', password: 'Password123!', field: 'email' as const },
    { email: 'new-user@example.com', password: '', field: 'password' as const },
  ])(
    'rejects an empty $field before requesting the service',
    async ({ email, password, field }) => {
      const { signUp: signUpService, serviceLayer } =
        makeSignUpAuthenticationService(() =>
          Effect.succeed(authenticatedSignUpResult)
        );

      const result = await Effect.runPromise(
        signUp({ email, password }).pipe(
          Effect.provide(serviceLayer),
          Effect.either
        )
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toMatchObject({
          _tag: 'InvalidSignUpInputError',
          field,
        });
      }
      expect(signUpService).not.toHaveBeenCalled();
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
      input: { email: 'new-user@example.com', password: null },
      field: 'password' as const,
    },
  ])(
    'rejects malformed external input before requesting the service',
    async ({ input, field }) => {
      const { signUp: signUpService, serviceLayer } =
        makeSignUpAuthenticationService(() =>
          Effect.succeed(authenticatedSignUpResult)
        );

      const result = await Effect.runPromise(
        signUpExternalInput(input).pipe(
          Effect.provide(serviceLayer),
          Effect.either
        )
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toMatchObject({
          _tag: 'InvalidSignUpInputError',
          field,
        });
      }
      expect(signUpService).not.toHaveBeenCalled();
    }
  );
});
