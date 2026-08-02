import { Effect, Schema } from 'effect';
import {
  InvalidPasswordResetRequestInputError,
  type AuthenticationError,
} from '../authentication-error';
import {
  AuthenticationServiceTag,
  type AuthenticationService,
  type PasswordResetRequest,
} from '../authentication-service';

/** Input accepted by the password-reset email workflow. */
export type RequestPasswordResetInput = PasswordResetRequest;

const EmailSchema = Schema.Trim.pipe(Schema.nonEmptyString());
const RedirectUrlSchema = Schema.Trim.pipe(
  Schema.nonEmptyString(),
  Schema.pattern(/^https?:\/\/[^/\s?#]+(?:[/?#]\S*)?$/)
);

const readInputField = (
  input: unknown,
  field: keyof RequestPasswordResetInput
): unknown =>
  typeof input === 'object' && input !== null
    ? Reflect.get(input, field)
    : undefined;

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
    const email = yield* Schema.decodeUnknown(EmailSchema)(
      readInputField(input, 'email')
    ).pipe(
      Effect.mapError(
        () => new InvalidPasswordResetRequestInputError({ field: 'email' })
      )
    );
    const redirectUrl = yield* Schema.decodeUnknown(RedirectUrlSchema)(
      readInputField(input, 'redirectUrl')
    ).pipe(
      Effect.mapError(
        () =>
          new InvalidPasswordResetRequestInputError({ field: 'redirectUrl' })
      )
    );

    const authenticationService = yield* AuthenticationServiceTag;
    return yield* authenticationService.requestPasswordReset({
      email,
      redirectUrl,
    });
  });
