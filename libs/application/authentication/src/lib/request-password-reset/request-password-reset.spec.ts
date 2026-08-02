import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import { PasswordResetRateLimitedError } from '../authentication-error';
import { makeRequestPasswordResetAuthenticationService } from '../testing';
import {
  requestPasswordReset,
  type RequestPasswordResetInput,
} from './request-password-reset';

const externalInput = (input: unknown) =>
  requestPasswordReset(input as RequestPasswordResetInput);

describe('requestPasswordReset', () => {
  it('normalizes input and delegates the non-enumerating request', async () => {
    const { requestPasswordReset: request, serviceLayer } =
      makeRequestPasswordResetAuthenticationService(() => Effect.void);

    await Effect.runPromise(
      requestPasswordReset({
        email: '  owner@example.com  ',
        redirectUrl: '  http://localhost:4200/  ',
      }).pipe(Effect.provide(serviceLayer))
    );

    expect(request).toHaveBeenCalledExactlyOnceWith({
      email: 'owner@example.com',
      redirectUrl: 'http://localhost:4200/',
    });
  });

  it('propagates a typed rate-limit failure unchanged', async () => {
    const failure = new PasswordResetRateLimitedError();
    const { serviceLayer } = makeRequestPasswordResetAuthenticationService(() =>
      Effect.fail(failure)
    );

    const result = await Effect.runPromise(
      requestPasswordReset({
        email: 'owner@example.com',
        redirectUrl: 'http://localhost:4200/',
      }).pipe(Effect.provide(serviceLayer), Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBe(failure);
    }
  });

  it.each([
    { input: undefined, field: 'email' as const },
    {
      input: { email: 'owner@example.com', redirectUrl: '/relative' },
      field: 'redirectUrl' as const,
    },
  ])(
    'rejects invalid $field input before delegation',
    async ({ input, field }) => {
      const { requestPasswordReset: request, serviceLayer } =
        makeRequestPasswordResetAuthenticationService(() => Effect.void);

      const result = await Effect.runPromise(
        externalInput(input).pipe(Effect.provide(serviceLayer), Effect.either)
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toMatchObject({
          _tag: 'InvalidPasswordResetRequestInputError',
          field,
        });
      }
      expect(request).not.toHaveBeenCalled();
    }
  );
});
