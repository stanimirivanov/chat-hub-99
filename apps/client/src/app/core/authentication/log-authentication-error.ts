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

  if (
    error._tag === 'InvalidCredentialsError' ||
    error._tag === 'InvalidSignInInputError'
  ) {
    console.warn('[authentication] Credentials rejected', {
      operation,
      errorTag: error._tag,
    });

    return;
  }

  console.error('[authentication] Operation failed', {
    operation,
    errorTag: error._tag,
    cause: error.cause,
  });
};
