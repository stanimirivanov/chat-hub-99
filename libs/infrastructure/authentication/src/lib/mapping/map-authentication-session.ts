import { Either, Schema } from 'effect';
import {
  AuthenticationSessionSchema,
  AuthenticationUnavailableError,
  type AuthenticationOperation,
  type AuthenticationSession,
} from '@chat-hub/application/authentication';

const decodeAuthenticationSession = Schema.decodeUnknownEither(
  AuthenticationSessionSchema
);

const ProviderSessionSchema = Schema.Struct({
  user: Schema.Struct({
    id: Schema.Unknown,
    email: Schema.Unknown,
  }),
});

/**
 * Converts a Supabase session into the application-owned session projection.
 *
 * Tokens and provider metadata are discarded. Email is required by the
 * current email/password application contract; a provider session without an
 * email is treated as an unavailable authentication result.
 */
export const mapAuthenticationSession = (
  session: unknown,
  operation: AuthenticationOperation
): Either.Either<AuthenticationSession, AuthenticationUnavailableError> => {
  const providerSession = Schema.decodeUnknownEither(ProviderSessionSchema)(
    session
  );

  if (Either.isLeft(providerSession)) {
    return Either.left(
      new AuthenticationUnavailableError({
        operation,
        cause: providerSession.left,
      })
    );
  }

  const email = providerSession.right.user.email;

  if (typeof email !== 'string' || email.trim().length === 0) {
    return Either.left(
      new AuthenticationUnavailableError({
        operation,
        cause: new Error('The authenticated user has no usable email address.'),
      })
    );
  }

  return decodeAuthenticationSession({
    userId: providerSession.right.user.id,
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
