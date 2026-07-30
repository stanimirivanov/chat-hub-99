import { Context, type Effect } from 'effect';
import type { Profile, ProfileId } from '@chat-hub/domain/profile';
import type { ProfileRepositoryError } from './profile-repository-error';

/**
 * Outbound port for current-profile discovery.
 */
export interface ProfileRepository {
  /**
   * Finds the RLS-visible current projection for one stable profile identity.
   */
  readonly findCurrentById: (
    profileId: ProfileId
  ) => Effect.Effect<Profile | null, ProfileRepositoryError>;
}

/**
 * Typed Effect service key used to request current-profile discovery.
 */
export const ProfileRepositoryTag = Context.GenericTag<ProfileRepository>(
  '@chat-hub/application/profile/ProfileRepository'
);
