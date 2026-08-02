import type {
  AuthenticationError,
  AuthenticationOperation,
} from '@chat-hub/application/authentication';
import { environment } from '@client-environments/environment';

/**
 * Writes diagnostic authentication information in non-production builds.
 *
 * The function must never receive or log passwords, access tokens, refresh
 * tokens, or complete session objects.
 */
export const logAuthenticationError = (
  operation: AuthenticationOperation,
  error: AuthenticationError
): void => {
  if (environment.production) {
    return;
  }

  switch (error._tag) {
    case 'InvalidCredentialsError':
    case 'InvalidSignInInputError':
    case 'InvalidSignUpInputError':
    case 'InvalidConfirmationEmailResendInputError':
    case 'InvalidPasswordResetRequestInputError':
    case 'InvalidPasswordUpdateInputError':
    case 'AccountAlreadyRegisteredError':
    case 'ConfirmationEmailResendRateLimitedError':
    case 'PasswordResetRateLimitedError':
    case 'PasswordRecoveryExpiredError':
    case 'PasswordUnchangedError':
      console.warn('[authentication] Expected failure', {
        operation,
        errorTag: error._tag,
      });

      return;
    case 'AuthenticationUnavailableError':
      console.error('[authentication] Operation failed', {
        operation,
        errorTag: error._tag,
        cause: error.cause,
      });
  }
};
