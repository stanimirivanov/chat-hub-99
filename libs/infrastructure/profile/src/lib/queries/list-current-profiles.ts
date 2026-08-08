import { Effect } from 'effect';
import type { ProfileRepositoryReadError } from '@omoikane/application/profile';
import type { Profile, ProfileId } from '@omoikane/domain/profile';
import { mapProfileRepositoryError } from '../errors';
import { mapCurrentProfile } from '../mapping';
import type { SupabaseProfileClient } from '../supabase-profile-client';

/**
 * Lists current profiles visible through Supabase RLS for stable identities.
 *
 * The query is executed once for the complete identity set. Provider failures
 * are translated and every returned row is decoded before crossing the
 * infrastructure boundary. Missing or RLS-hidden identities are absent from
 * the result.
 */
export const listCurrentProfiles = (
  client: SupabaseProfileClient,
  profileIds: readonly ProfileId[]
): Effect.Effect<readonly Profile[], ProfileRepositoryReadError> => {
  if (profileIds.length === 0) {
    return Effect.succeed([]);
  }

  return Effect.tryPromise({
    try: () =>
      client
        .from('current_profiles')
        .select('user_id, username, display_name, avatar_url, status')
        .in('user_id', profileIds),
    catch: mapProfileRepositoryError,
  }).pipe(
    Effect.flatMap(
      ({
        data,
        error,
      }): Effect.Effect<readonly Profile[], ProfileRepositoryReadError> => {
        if (error) {
          return Effect.fail(mapProfileRepositoryError(error));
        }

        return Effect.forEach(data ?? [], mapCurrentProfile);
      }
    )
  );
};
