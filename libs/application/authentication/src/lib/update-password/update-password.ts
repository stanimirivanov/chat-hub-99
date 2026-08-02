import { Effect, Schema } from 'effect';
import {
  InvalidPasswordUpdateInputError,
  type AuthenticationError,
} from '../authentication-error';
import {
  AuthenticationServiceTag,
  type AuthenticationService,
} from '../authentication-service';

/** Input accepted while completing an active password-recovery session. */
export interface UpdatePasswordInput {
  readonly password: string;
  readonly passwordConfirmation: string;
}

const PasswordSchema = Schema.String.pipe(Schema.minLength(1));

const readInputField = (
  input: unknown,
  field: keyof UpdatePasswordInput
): unknown =>
  typeof input === 'object' && input !== null
    ? Reflect.get(input, field)
    : undefined;

/**
 * Builds a program that replaces the recovery session's password.
 *
 * Both password fields are decoded and compared before the provider is
 * requested. The password itself remains unchanged because whitespace may be
 * intentional credential data.
 */
export const updatePassword = (
  input: UpdatePasswordInput
): Effect.Effect<void, AuthenticationError, AuthenticationService> =>
  Effect.gen(function* () {
    const password = yield* Schema.decodeUnknown(PasswordSchema)(
      readInputField(input, 'password')
    ).pipe(
      Effect.mapError(
        () => new InvalidPasswordUpdateInputError({ field: 'password' })
      )
    );
    const passwordConfirmation = yield* Schema.decodeUnknown(PasswordSchema)(
      readInputField(input, 'passwordConfirmation')
    ).pipe(
      Effect.mapError(
        () =>
          new InvalidPasswordUpdateInputError({
            field: 'passwordConfirmation',
          })
      )
    );

    if (password !== passwordConfirmation) {
      return yield* new InvalidPasswordUpdateInputError({
        field: 'passwordConfirmation',
      });
    }

    const authenticationService = yield* AuthenticationServiceTag;
    return yield* authenticationService.updatePassword(password);
  });
