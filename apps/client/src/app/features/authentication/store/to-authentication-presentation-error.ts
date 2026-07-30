import type { AuthenticationError } from '@chat-hub/application/authentication';
import type { AuthenticationPresentationError } from './authentication.state';

/**
 * Converts application authentication failures into safe user-facing text.
 *
 * Infrastructure causes and provider messages are intentionally not rendered.
 */
export const toAuthenticationPresentationError = (
  error: AuthenticationError
): AuthenticationPresentationError => {
  switch (error._tag) {
    case 'InvalidCredentialsError':
      return {
        message: 'The email or password is incorrect.',
      };

    case 'AuthenticationUnavailableError':
      return {
        message: 'Authentication is currently unavailable. Please try again.',
      };
  }
};
