import type { AuthenticationSession } from '@chat-hub/application/authentication';

/**
 * Overall authentication state visible to the application shell.
 */
export type AuthenticationStatus =
  | 'initializing'
  | 'anonymous'
  | 'authenticated';

/**
 * State of one user-triggered authentication operation.
 */
export type AuthenticationOperationStatus = 'idle' | 'pending' | 'failed';

/** State of the account-registration command and its non-error completion. */
export type SignUpStatus =
  | AuthenticationOperationStatus
  | 'confirmation-required';

/** State of resending confirmation and its non-enumerating completion. */
export type ConfirmationEmailResendStatus =
  | AuthenticationOperationStatus
  | 'sent';

/** State of requesting a recovery email and its safe completion notice. */
export type PasswordResetRequestStatus = AuthenticationOperationStatus | 'sent';

/** State of replacing a password after a recovery session is established. */
export type PasswordRecoveryStatus =
  | 'idle'
  | 'ready'
  | 'pending'
  | 'failed'
  | 'completed';

/**
 * Safe error representation rendered by Angular.
 */
export interface AuthenticationPresentationError {
  readonly message: string;
}

/**
 * State owned by the root authentication store.
 */
export interface AuthenticationState {
  readonly status: AuthenticationStatus;

  readonly session: AuthenticationSession | null;

  readonly signInStatus: AuthenticationOperationStatus;

  readonly signUpStatus: SignUpStatus;

  readonly confirmationEmail: string | null;

  readonly confirmationEmailResendStatus: ConfirmationEmailResendStatus;

  readonly signOutStatus: AuthenticationOperationStatus;

  readonly passwordResetRequestStatus: PasswordResetRequestStatus;

  readonly passwordRecoveryStatus: PasswordRecoveryStatus;

  readonly error: AuthenticationPresentationError | null;
}

/**
 * Initial state used before session restoration completes.
 */
export const initialAuthenticationState: AuthenticationState = {
  status: 'initializing',
  session: null,
  signInStatus: 'idle',
  signUpStatus: 'idle',
  confirmationEmail: null,
  confirmationEmailResendStatus: 'idle',
  signOutStatus: 'idle',
  passwordResetRequestStatus: 'idle',
  passwordRecoveryStatus: 'idle',
  error: null,
};
