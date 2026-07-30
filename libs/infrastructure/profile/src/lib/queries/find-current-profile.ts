import { Effect } from 'effect';
import type { ProfileRepositoryError } from '@chat-hub/application/profile';
import type { Profile, ProfileId } from '@chat-hub/domain/profile';
import { mapProfileRepositoryError } from '../errors';
import { mapCurrentProfile } from '../mapping';
import type { SupabaseProfileClient } from '../supabase-profile-client';

/**
 * Finds one RLS-visible current profile by stable identity.
 *
 * PostgREST and thrown transport failures are translated into the application
 * error vocabulary. A missing row remains `null`; the application use case
 * decides whether absence is meaningful.
 */
export const findCurrentProfile = (
  client: SupabaseProfileClient,
  profileId: ProfileId
): Effect.Effect<Profile | null, ProfileRepositoryError> =>
  Effect.tryPromise({
    try: () =>
      client
        .from('current_profiles')
        .select('user_id, username, display_name, avatar_url, status')
        .eq('user_id', profileId)
        .maybeSingle(),
    catch: mapProfileRepositoryError,
  }).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error) {
        return Effect.fail(mapProfileRepositoryError(error));
      }

      return data === null ? Effect.succeed(null) : mapCurrentProfile(data);
    })
  );
