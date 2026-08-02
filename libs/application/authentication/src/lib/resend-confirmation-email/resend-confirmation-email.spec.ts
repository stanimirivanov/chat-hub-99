import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  ConfirmationEmailResendRateLimitedError,
  InvalidConfirmationEmailResendInputError,
} from '../authentication-error';
import { makeResendConfirmationEmailAuthenticationService } from '../testing';
import {
  resendConfirmationEmail,
  type ResendConfirmationEmailInput,
} from './resend-confirmation-email';

const externalInput = (input: unknown) =>
  resendConfirmationEmail(input as ResendConfirmationEmailInput);

describe('resendConfirmationEmail', () => {
  it('normalizes input and delegates one non-enumerating request', async () => {
    const { resendConfirmationEmail: resend, serviceLayer } =
      makeResendConfirmationEmailAuthenticationService(() => Effect.void);

    await Effect.runPromise(
      resendConfirmationEmail({
        email: '  owner@example.com  ',
        redirectUrl: '  http://localhost:4200/  ',
      }).pipe(Effect.provide(serviceLayer))
    );

    expect(resend).toHaveBeenCalledExactlyOnceWith({
      email: 'owner@example.com',
      redirectUrl: 'http://localhost:4200/',
    });
  });

  it('maps unusable input to its confirmation-resend vocabulary', async () => {
    const { resendConfirmationEmail: resend, serviceLayer } =
      makeResendConfirmationEmailAuthenticationService(() => Effect.void);
    const result = await Effect.runPromise(
      externalInput({ email: 'owner@example.com', redirectUrl: null }).pipe(
        Effect.provide(serviceLayer),
        Effect.either
      )
    );

    expect(result).toEqual(
      Either.left(
        new InvalidConfirmationEmailResendInputError({ field: 'redirectUrl' })
      )
    );
    expect(resend).not.toHaveBeenCalled();
  });

  it('propagates a typed rate-limit failure unchanged', async () => {
    const failure = new ConfirmationEmailResendRateLimitedError();
    const { serviceLayer } = makeResendConfirmationEmailAuthenticationService(
      () => Effect.fail(failure)
    );
    const result = await Effect.runPromise(
      resendConfirmationEmail({
        email: 'owner@example.com',
        redirectUrl: 'http://localhost:4200/',
      }).pipe(Effect.provide(serviceLayer), Effect.either)
    );

    expect(result).toEqual(Either.left(failure));
  });
});
