import { Either, Schema } from 'effect';
import {
  AuthenticationSessionSchema,
  AuthenticationUnavailableError,
  type AuthenticationOperation,
  type AuthenticationSession,
} from '@chat-hub/application/authentication';

export interface AuthenticationSessionSource {
  readonly user: {
    readonly id: unknown;
    readonly email?: unknown;
  };
}

const decodeAuthenticationSession = Schema.decodeUnknownEither(
  AuthenticationSessionSchema
);

/**
 * Converts a Supabase session into the application-owned session projection.
 *
 * Tokens and provider metadata are discarded. Email is required by the
 * current email/password application contract; a provider session without an
 * email is treated as an unavailable authentication result.
 */
export const mapAuthenticationSession = (
  session: AuthenticationSessionSource,
  operation: AuthenticationOperation
): Either.Either<AuthenticationSession, AuthenticationUnavailableError> => {
  const email = session.user.email;

  if (typeof email !== 'string' || email.trim().length === 0) {
    return Either.left(
      new AuthenticationUnavailableError({
        operation,
        cause: new Error('The authenticated user has no usable email address.'),
      })
    );
  }

  return decodeAuthenticationSession({
    userId: session.user.id,
    email: email.trim(),
  }).pipe(
    Either.mapLeft(
      (cause) =>
        new AuthenticationUnavailableError({
          operation,
          cause,
        })
    )
  );
};
