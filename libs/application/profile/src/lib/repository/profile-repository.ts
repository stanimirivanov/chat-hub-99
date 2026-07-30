import { Context, type Effect } from 'effect';
import type { Profile, ProfileId } from '@chat-hub/domain/profile';
import type {
  ProfileRepositoryReadError,
  ProfileRepositoryUpdateError,
} from './profile-repository-error';

/**
 * Validated values used to update the authenticated user's current profile.
 */
export interface UpdateCurrentProfileCommand {
  readonly displayName: string;
  readonly username: string | null;
  readonly avatarUrl: string | null;
}

/**
 * Outbound port for current-profile discovery and self-service updates.
 */
export interface ProfileRepository {
  /**
   * Finds the RLS-visible current projection for one stable profile identity.
   *
   * The Effect succeeds with a profile or explicit absence, fails with read or
   * decoding errors, and has no additional service requirement.
   */
  readonly findCurrentById: (
    profileId: ProfileId
  ) => Effect.Effect<Profile | null, ProfileRepositoryReadError>;

  /**
   * Updates editable fields for the provider-authenticated profile.
   *
   * The Effect succeeds with the canonical updated profile, fails with update,
   * validation, or username-conflict errors, and has no additional service
   * requirement.
   */
  readonly updateCurrent: (
    command: UpdateCurrentProfileCommand
  ) => Effect.Effect<Profile, ProfileRepositoryUpdateError>;

  /**
   * Lists the RLS-visible current projections for the requested identities.
   *
   * Missing or hidden profiles are omitted from the result.
   */
  readonly listCurrentByIds: (
    profileIds: readonly ProfileId[]
  ) => Effect.Effect<readonly Profile[], ProfileRepositoryReadError>;
}

/**
 * Typed Effect service key used to request current-profile discovery.
 */
export const ProfileRepositoryTag = Context.GenericTag<ProfileRepository>(
  '@chat-hub/application/profile/ProfileRepository'
);
