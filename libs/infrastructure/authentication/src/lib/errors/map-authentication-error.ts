import type { AuthError } from '@supabase/supabase-js';
import {
  AuthenticationUnavailableError,
  InvalidCredentialsError,
  type AuthenticationError,
  type AuthenticationOperation,
} from '@chat-hub/application/authentication';

/**
 * Translates a Supabase authentication failure into application terminology.
 *
 * Classification uses the provider error code rather than human-readable
 * message text. Raw provider errors never cross the infrastructure boundary.
 */
export const mapAuthenticationError = (
  error: AuthError,
  operation: AuthenticationOperation
): AuthenticationError => {
  if (operation === 'sign-in' && error.code === 'invalid_credentials') {
    return new InvalidCredentialsError();
  }

  return new AuthenticationUnavailableError({
    operation,
    cause: error,
  });
};
