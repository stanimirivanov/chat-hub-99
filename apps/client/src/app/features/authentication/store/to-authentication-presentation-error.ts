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
    case 'InvalidSignInInputError':
      return {
        message:
          error.field === 'email'
            ? 'Enter your email address.'
            : 'Enter your password.',
      };

    case 'InvalidCredentialsError':
      return {
        message: 'The email or password is incorrect.',
      };

    case 'InvalidSignUpInputError':
      return {
        message:
          error.field === 'email'
            ? 'Enter a valid email address.'
            : 'Choose a stronger password.',
      };

    case 'AccountAlreadyRegisteredError':
      return {
        message: 'An account with this email already exists. Try signing in.',
      };

    case 'AuthenticationUnavailableError':
      return {
        message: 'Authentication is currently unavailable. Please try again.',
      };
  }
};
