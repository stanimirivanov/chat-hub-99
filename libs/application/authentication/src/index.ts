export {
  AuthenticationSessionSchema,
  type AuthenticationSession,
  type AuthenticationSessionChange,
} from './lib/authentication-session';

export {
  InvalidCredentialsError,
  InvalidSignInInputError,
  InvalidSignUpInputError,
  InvalidConfirmationEmailResendInputError,
  AccountAlreadyRegisteredError,
  ConfirmationEmailResendRateLimitedError,
  InvalidPasswordResetRequestInputError,
  InvalidPasswordUpdateInputError,
  PasswordResetRateLimitedError,
  PasswordRecoveryExpiredError,
  PasswordUnchangedError,
  AuthenticationUnavailableError,
  type AuthenticationOperation,
  type AuthenticationError,
} from './lib/authentication-error';

export {
  AuthenticationServiceTag,
  type AuthenticationService,
  type ConfirmationEmailResendRequest,
  type PasswordResetRequest,
  type SignUpResult,
} from './lib/authentication-service';

export type { EmailPasswordCredentials } from './lib/email-password-credentials';

export { observeSessionChanges } from './lib/observe-session';

export { restoreSession } from './lib/restore-session';

export {
  resendConfirmationEmail,
  type ResendConfirmationEmailInput,
} from './lib/resend-confirmation-email';

export {
  requestPasswordReset,
  type RequestPasswordResetInput,
} from './lib/request-password-reset';

export { signIn, type SignInInput } from './lib/sign-in';

export { signUp, type SignUpInput } from './lib/sign-up';

export { signOut } from './lib/sign-out';

export {
  updatePassword,
  type UpdatePasswordInput,
} from './lib/update-password';
