import { Effect } from 'effect';
import {
  InvalidSignInInputError,
  type AuthenticationError,
} from '../authentication-error';
import {
  AuthenticationServiceTag,
  type AuthenticationService,
} from '../authentication-service';
import type { AuthenticationSession } from '../authentication-session';

/**
 * Input accepted by the sign-in use case.
 */
export interface SignInInput {
  readonly email: string;
  readonly password: string;
}

/**
 * Builds a program that authenticates using email and password.
 *
 * Surrounding whitespace is removed from the email because it is not
 * semantically part of an email identity. The password is passed unchanged
 * because whitespace may be intentional credential data.
 *
 * The Effect succeeds with the authenticated session, fails with the
 * application authentication error vocabulary, and requires an
 * `AuthenticationService`.
 */
export const signIn = (
  input: SignInInput
): Effect.Effect<
  AuthenticationSession,
  AuthenticationError,
  AuthenticationService
> =>
  Effect.gen(function* () {
    const email = input.email.trim();

    if (email.length === 0) {
      return yield* new InvalidSignInInputError({
        field: 'email',
      });
    }

    if (input.password.length === 0) {
      return yield* new InvalidSignInInputError({
        field: 'password',
      });
    }

    const authenticationService = yield* AuthenticationServiceTag;

    return yield* authenticationService.signIn({
      email,
      password: input.password,
    });
  });
