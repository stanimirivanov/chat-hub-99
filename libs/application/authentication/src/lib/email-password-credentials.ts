import { Effect, Schema } from 'effect';

/** Email and password values shared by authentication commands. */
export interface EmailPasswordCredentials {
  readonly email: string;
  readonly password: string;
}

export type EmailPasswordCredentialField = keyof EmailPasswordCredentials;

const EmailSchema = Schema.Trim.pipe(Schema.nonEmptyString());
const PasswordSchema = Schema.String.pipe(Schema.minLength(1));

const readCredential = (
  input: unknown,
  field: EmailPasswordCredentialField
): unknown =>
  typeof input === 'object' && input !== null
    ? Reflect.get(input, field)
    : undefined;

/**
 * Decodes the common email/password boundary without owning use-case errors.
 *
 * Email whitespace is normalized while password bytes remain unchanged. Each
 * caller supplies its own field-error constructor so sign-in and sign-up keep
 * distinct application error vocabularies.
 */
export const decodeEmailPasswordCredentials = <Error>(
  input: unknown,
  onInvalidField: (field: EmailPasswordCredentialField) => Error
): Effect.Effect<EmailPasswordCredentials, Error> =>
  Effect.gen(function* () {
    const email = yield* Schema.decodeUnknown(EmailSchema)(
      readCredential(input, 'email')
    ).pipe(Effect.mapError(() => onInvalidField('email')));

    const password = yield* Schema.decodeUnknown(PasswordSchema)(
      readCredential(input, 'password')
    ).pipe(Effect.mapError(() => onInvalidField('password')));

    return { email, password };
  });
