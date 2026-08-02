import { Effect } from 'effect';
import {
  InvalidSignUpInputError,
  type AuthenticationError,
} from '../authentication-error';
import {
  AuthenticationServiceTag,
  type AuthenticationService,
  type SignUpResult,
} from '../authentication-service';
import {
  decodeEmailPasswordCredentials,
  type EmailPasswordCredentials,
} from '../email-password-credentials';

/** Input accepted by the account-registration use case. */
export type SignUpInput = EmailPasswordCredentials;

/**
 * Builds a program that registers an email/password account.
 *
 * Runtime decoding rejects missing, null, non-string, and empty fields before
 * requesting the authentication provider. Email whitespace is removed while
 * password content is preserved. Success explicitly distinguishes an
 * authenticated session from an account awaiting email confirmation.
 */
export const signUp = (
  input: SignUpInput
): Effect.Effect<SignUpResult, AuthenticationError, AuthenticationService> =>
  Effect.gen(function* () {
    const credentials = yield* decodeEmailPasswordCredentials(
      input,
      (field) => new InvalidSignUpInputError({ field })
    );

    const authenticationService = yield* AuthenticationServiceTag;

    return yield* authenticationService.signUp(credentials);
  });
