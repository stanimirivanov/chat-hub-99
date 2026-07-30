import type { Profile } from '@chat-hub/domain/profile';

export type CurrentProfileLoadStatus = 'idle' | 'loading' | 'loaded' | 'failed';
export type CurrentProfileUpdateStatus = 'idle' | 'updating' | 'failed';

export interface CurrentProfilePresentationError {
  readonly message: string;
}

/**
 * Presentation state for the profile associated with the current session.
 */
export interface CurrentProfileState {
  readonly userId: string | null;
  readonly profile: Profile | null;
  readonly loadStatus: CurrentProfileLoadStatus;
  readonly error: CurrentProfilePresentationError | null;
  readonly updateStatus: CurrentProfileUpdateStatus;
  readonly updateError: CurrentProfilePresentationError | null;
}

export const initialCurrentProfileState: CurrentProfileState = {
  userId: null,
  profile: null,
  loadStatus: 'idle',
  error: null,
  updateStatus: 'idle',
  updateError: null,
};
