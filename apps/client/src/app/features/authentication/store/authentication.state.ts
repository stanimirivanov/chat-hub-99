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

  readonly signOutStatus: AuthenticationOperationStatus;

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
  signOutStatus: 'idle',
  error: null,
};
