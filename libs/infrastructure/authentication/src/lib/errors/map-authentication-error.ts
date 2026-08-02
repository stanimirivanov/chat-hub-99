import type { AuthError } from '@supabase/supabase-js';
import {
  AuthenticationUnavailableError,
  AccountAlreadyRegisteredError,
  InvalidCredentialsError,
  InvalidSignUpInputError,
  InvalidPasswordResetRequestInputError,
  InvalidPasswordUpdateInputError,
  PasswordRecoveryExpiredError,
  PasswordResetRateLimitedError,
  PasswordUnchangedError,
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

  if (operation === 'sign-up') {
    if (error.code === 'user_already_exists') {
      return new AccountAlreadyRegisteredError();
    }

    if (error.code === 'email_address_invalid') {
      return new InvalidSignUpInputError({ field: 'email' });
    }

    if (error.code === 'weak_password') {
      return new InvalidSignUpInputError({ field: 'password' });
    }
  }

  if (operation === 'request-password-reset') {
    if (error.code === 'email_address_invalid') {
      return new InvalidPasswordResetRequestInputError({ field: 'email' });
    }

    if (
      error.code === 'over_email_send_rate_limit' ||
      error.code === 'over_request_rate_limit'
    ) {
      return new PasswordResetRateLimitedError();
    }
  }

  if (operation === 'update-password') {
    if (error.code === 'weak_password') {
      return new InvalidPasswordUpdateInputError({ field: 'password' });
    }

    if (error.code === 'same_password') {
      return new PasswordUnchangedError();
    }

    if (
      error.code === 'session_not_found' ||
      error.code === 'session_expired' ||
      error.code === 'bad_jwt'
    ) {
      return new PasswordRecoveryExpiredError();
    }
  }

  return new AuthenticationUnavailableError({
    operation,
    cause: error,
  });
};
