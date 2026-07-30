import { Either } from 'effect';
import type { Session } from '@supabase/supabase-js';
import {
  AuthenticationUnavailableError,
  type AuthenticationOperation,
  type AuthenticationSession,
} from '@chat-hub/application/authentication';

/**
 * Converts a Supabase session into the application-owned session projection.
 *
 * Tokens and provider metadata are discarded. Email is required by the
 * current email/password application contract; a provider session without an
 * email is treated as an unavailable authentication result.
 */
export const mapAuthenticationSession = (
  session: Session,
  operation: AuthenticationOperation
): Either.Either<AuthenticationSession, AuthenticationUnavailableError> => {
  const email = session.user.email;

  if (email === undefined) {
    return Either.left(
      new AuthenticationUnavailableError({
        operation,
        cause: new Error('The authenticated user has no email address.'),
      })
    );
  }

  return Either.right({
    userId: session.user.id,
    email,
  });
};
