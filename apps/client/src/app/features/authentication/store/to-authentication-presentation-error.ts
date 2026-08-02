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

    case 'InvalidConfirmationEmailResendInputError':
      return {
        message:
          error.field === 'email'
            ? 'Enter a valid email address.'
            : 'Email confirmation is currently unavailable. Please try again.',
      };

    case 'ConfirmationEmailResendRateLimitedError':
      return {
        message: 'Wait a moment before requesting another confirmation email.',
      };

    case 'InvalidPasswordResetRequestInputError':
      return {
        message:
          error.field === 'email'
            ? 'Enter a valid email address.'
            : 'Password recovery is currently unavailable. Please try again.',
      };

    case 'InvalidPasswordUpdateInputError':
      return {
        message:
          error.field === 'password'
            ? 'Choose a stronger password.'
            : 'The password confirmation must match.',
      };

    case 'PasswordResetRateLimitedError':
      return {
        message: 'Wait a moment before requesting another recovery email.',
      };

    case 'PasswordRecoveryExpiredError':
      return {
        message: 'This recovery session has expired. Request a new reset link.',
      };

    case 'PasswordUnchangedError':
      return {
        message: 'Choose a password different from your current password.',
      };

    case 'AuthenticationUnavailableError':
      return {
        message: 'Authentication is currently unavailable. Please try again.',
      };
  }
};
