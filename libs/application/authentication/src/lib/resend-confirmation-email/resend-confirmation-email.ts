import { Effect } from 'effect';
import {
  InvalidConfirmationEmailResendInputError,
  type AuthenticationError,
} from '../authentication-error';
import {
  AuthenticationServiceTag,
  type AuthenticationService,
  type ConfirmationEmailResendRequest,
} from '../authentication-service';
import { decodeEmailRedirectRequest } from '../email-redirect-request';

/** Input accepted by the confirmation-email resend workflow. */
export type ResendConfirmationEmailInput = ConfirmationEmailResendRequest;

/**
 * Builds a program that resends an account-confirmation email.
 *
 * The email and browser-owned callback are normalized before provider access.
 * Success is intentionally empty so callers do not infer account state from
 * the response.
 */
export const resendConfirmationEmail = (
  input: ResendConfirmationEmailInput
): Effect.Effect<void, AuthenticationError, AuthenticationService> =>
  Effect.gen(function* () {
    const request = yield* decodeEmailRedirectRequest(
      input,
      (field) => new InvalidConfirmationEmailResendInputError({ field })
    );
    const authenticationService = yield* AuthenticationServiceTag;

    return yield* authenticationService.resendConfirmationEmail(request);
  });
