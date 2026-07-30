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
  signOutStatus: 'idle',
  error: null,
};
