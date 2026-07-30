import { Effect, Schema } from 'effect';
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

const EmailSchema = Schema.Trim.pipe(Schema.nonEmptyString());
const PasswordSchema = Schema.String.pipe(Schema.minLength(1));

const readInputField = (input: unknown, field: keyof SignInInput): unknown =>
  typeof input === 'object' && input !== null
    ? Reflect.get(input, field)
    : undefined;

const decodeSignInInput = (
  input: unknown
): Effect.Effect<SignInInput, InvalidSignInInputError> =>
  Effect.gen(function* () {
    const email = yield* Schema.decodeUnknown(EmailSchema)(
      readInputField(input, 'email')
    ).pipe(
      Effect.mapError(
        () =>
          new InvalidSignInInputError({
            field: 'email',
          })
      )
    );

    const password = yield* Schema.decodeUnknown(PasswordSchema)(
      readInputField(input, 'password')
    ).pipe(
      Effect.mapError(
        () =>
          new InvalidSignInInputError({
            field: 'password',
          })
      )
    );

    return {
      email,
      password,
    };
  });

/**
 * Builds a program that authenticates using email and password.
 *
 * Runtime decoding rejects missing, null, non-string, and empty fields before
 * requesting the authentication service. Surrounding whitespace is removed
 * from the email because it is not semantically part of an email identity.
 * The password is passed unchanged because whitespace may be intentional
 * credential data.
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
    const credentials = yield* decodeSignInInput(input);

    const authenticationService = yield* AuthenticationServiceTag;

    return yield* authenticationService.signIn(credentials);
  });
