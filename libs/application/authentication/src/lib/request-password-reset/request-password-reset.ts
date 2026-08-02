import { Effect } from 'effect';
import {
  InvalidPasswordResetRequestInputError,
  type AuthenticationError,
} from '../authentication-error';
import {
  AuthenticationServiceTag,
  type AuthenticationService,
  type PasswordResetRequest,
} from '../authentication-service';
import { decodeEmailRedirectRequest } from '../email-redirect-request';

/** Input accepted by the password-reset email workflow. */
export type RequestPasswordResetInput = PasswordResetRequest;

/**
 * Builds a program that requests a password-recovery email.
 *
 * The email and browser-owned absolute callback URL are decoded before the
 * provider is requested. Success is intentionally empty and must be presented
 * without revealing whether an account exists for the supplied address.
 */
export const requestPasswordReset = (
  input: RequestPasswordResetInput
): Effect.Effect<void, AuthenticationError, AuthenticationService> =>
  Effect.gen(function* () {
    const request = yield* decodeEmailRedirectRequest(
      input,
      (field) => new InvalidPasswordResetRequestInputError({ field })
    );

    const authenticationService = yield* AuthenticationServiceTag;
    return yield* authenticationService.requestPasswordReset(request);
  });
