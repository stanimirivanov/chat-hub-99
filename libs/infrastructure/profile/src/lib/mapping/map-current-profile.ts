import { Effect, Schema } from 'effect';
import {
  InvalidProfileDataError,
  type ProfileRepositoryError,
} from '@chat-hub/application/profile';
import { ProfileSchema, type Profile } from '@chat-hub/domain/profile';

const decodeProfile = Schema.decodeUnknown(ProfileSchema);

/**
 * Narrow projection selected from `current_profiles`.
 *
 * PostgreSQL view metadata reports these columns as nullable, so every row is
 * decoded before it crosses the infrastructure boundary.
 */
export interface CurrentProfileRow {
  readonly user_id: string | null;
  readonly username: string | null;
  readonly display_name: string | null;
  readonly avatar_url: string | null;
  readonly status: string | null;
}

/**
 * Decodes one current-profile row into the profile domain projection.
 */
export const mapCurrentProfile = (
  row: CurrentProfileRow
): Effect.Effect<Profile, ProfileRepositoryError> =>
  decodeProfile({
    id: row.user_id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    status: row.status,
  }).pipe(
    Effect.mapError(
      (cause) =>
        new InvalidProfileDataError({
          cause,
        })
    )
  );
