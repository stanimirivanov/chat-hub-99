import { Data } from 'effect';

/**
 * Authentication operations understood by the application layer.
 *
 * The vocabulary is provider-independent so Supabase-specific operation names
 * do not escape infrastructure.
 */
export type AuthenticationOperation =
  | 'restore-session'
  | 'sign-in'
  | 'sign-up'
  | 'resend-confirmation-email'
  | 'request-password-reset'
  | 'update-password'
  | 'sign-out'
  | 'observe-session'
  | 'get-access-token';

/**
 * Indicates that supplied credentials were rejected.
 *
 * The error deliberately does not reveal whether the email exists.
 */
export class InvalidCredentialsError extends Data.TaggedError(
  'InvalidCredentialsError'
) {}

/**
 * Indicates that sign-in was attempted without usable credentials.
 */
export class InvalidSignInInputError extends Data.TaggedError(
  'InvalidSignInInputError'
)<{
  readonly field: 'email' | 'password';
}> {}

/** Indicates that registration was attempted without usable credentials. */
export class InvalidSignUpInputError extends Data.TaggedError(
  'InvalidSignUpInputError'
)<{
  readonly field: 'email' | 'password';
}> {}

/** Indicates that the provider rejected an already registered email address. */
export class AccountAlreadyRegisteredError extends Data.TaggedError(
  'AccountAlreadyRegisteredError'
) {}

/** Indicates malformed input at the confirmation-email resend boundary. */
export class InvalidConfirmationEmailResendInputError extends Data.TaggedError(
  'InvalidConfirmationEmailResendInputError'
)<{
  readonly field: 'email' | 'redirectUrl';
}> {}

/** Indicates that another confirmation email cannot be sent yet. */
export class ConfirmationEmailResendRateLimitedError extends Data.TaggedError(
  'ConfirmationEmailResendRateLimitedError'
) {}

/** Indicates malformed input at the password-reset request boundary. */
export class InvalidPasswordResetRequestInputError extends Data.TaggedError(
  'InvalidPasswordResetRequestInputError'
)<{
  readonly field: 'email' | 'redirectUrl';
}> {}

/** Indicates malformed or mismatched replacement-password input. */
export class InvalidPasswordUpdateInputError extends Data.TaggedError(
  'InvalidPasswordUpdateInputError'
)<{
  readonly field: 'password' | 'passwordConfirmation';
}> {}

/** Indicates that another recovery email cannot be sent yet. */
export class PasswordResetRateLimitedError extends Data.TaggedError(
  'PasswordResetRateLimitedError'
) {}

/** Indicates that the recovery session can no longer update a password. */
export class PasswordRecoveryExpiredError extends Data.TaggedError(
  'PasswordRecoveryExpiredError'
) {}

/** Indicates that the replacement password equals the existing password. */
export class PasswordUnchangedError extends Data.TaggedError(
  'PasswordUnchangedError'
) {}

/**
 * Indicates that authentication could not be completed for a reason other
 * than rejected credentials.
 *
 * The infrastructure cause is preserved for diagnostics but must not be
 * rendered directly to the user.
 */
export class AuthenticationUnavailableError extends Data.TaggedError(
  'AuthenticationUnavailableError'
)<{
  readonly operation: AuthenticationOperation;
  readonly cause: unknown;
}> {}

/**
 * Expected authentication failures exposed by the application boundary.
 */
export type AuthenticationError =
  | InvalidSignInInputError
  | InvalidSignUpInputError
  | InvalidConfirmationEmailResendInputError
  | InvalidPasswordResetRequestInputError
  | InvalidPasswordUpdateInputError
  | InvalidCredentialsError
  | AccountAlreadyRegisteredError
  | ConfirmationEmailResendRateLimitedError
  | PasswordResetRateLimitedError
  | PasswordRecoveryExpiredError
  | PasswordUnchangedError
  | AuthenticationUnavailableError;
