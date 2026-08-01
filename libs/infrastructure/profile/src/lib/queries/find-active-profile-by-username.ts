import { Effect } from 'effect';
import {
  InvalidProfileDataError,
  type ProfileRepositoryReadError,
} from '@chat-hub/application/profile';
import type { Profile } from '@chat-hub/domain/profile';
import { mapProfileRepositoryError } from '../errors';
import { mapCurrentProfile } from '../mapping';
import type { SupabaseProfileClient } from '../supabase-profile-client';

/**
 * Finds one active current profile by an exact case-insensitive username.
 *
 * PostgreSQL `ILIKE` wildcard characters are escaped so the value remains an
 * exact lookup rather than widening into profile search. The returned row is
 * decoded and independently checked as active before crossing the adapter.
 */
export const findActiveProfileByUsername = (
  client: SupabaseProfileClient,
  username: string
): Effect.Effect<Profile | null, ProfileRepositoryReadError> =>
  Effect.tryPromise({
    try: () =>
      client
        .from('current_profiles')
        .select('user_id, username, display_name, avatar_url, status')
        .ilike('username', escapeIlikeLiteral(username))
        .eq('status', 'active')
        .maybeSingle(),
    catch: mapProfileRepositoryError,
  }).pipe(
    Effect.flatMap(
      ({
        data,
        error,
      }): Effect.Effect<Profile | null, ProfileRepositoryReadError> => {
        if (error) {
          return Effect.fail(mapProfileRepositoryError(error));
        }

        if (data === null) {
          return Effect.succeed(null);
        }

        return mapCurrentProfile(data).pipe(
          Effect.flatMap((profile) =>
            profile.status === 'active'
              ? Effect.succeed(profile)
              : Effect.fail(
                  new InvalidProfileDataError({
                    cause:
                      'The active-profile lookup returned an inactive row.',
                  })
                )
          )
        );
      }
    )
  );

const escapeIlikeLiteral = (value: string): string =>
  value.replace(/[\\%_]/g, '\\$&');
