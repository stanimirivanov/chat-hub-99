import { Effect } from 'effect';
import {
  InvalidProfileDataError,
  type ProfileRepositoryUpdateError,
  type UpdateCurrentProfileCommand,
} from '@chat-hub/application/profile';
import type { Profile } from '@chat-hub/domain/profile';
import type { UpdateMyProfileResult } from '@chat-hub/shared/database';
import { mapProfileRepositoryError, mapProfileUpdateError } from '../errors';
import { mapCurrentProfile, toUpdateMyProfileArgs } from '../mapping';
import type { SupabaseProfileClient } from '../supabase-profile-client';

/**
 * Executes the immutable self-service profile update command.
 *
 * The returned profile-version row is decoded through the same domain mapper
 * used by current-profile reads, so canonical database normalization crosses
 * the infrastructure boundary exactly once.
 */
export const updateCurrentProfile = (
  client: SupabaseProfileClient,
  command: UpdateCurrentProfileCommand
): Effect.Effect<Profile, ProfileRepositoryUpdateError> =>
  Effect.tryPromise({
    try: () => client.rpc('update_my_profile', toUpdateMyProfileArgs(command)),
    catch: mapProfileRepositoryError,
  }).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error) {
        return Effect.fail(mapProfileUpdateError(command, error));
      }

      return mapUpdateResult(data);
    })
  );

const mapUpdateResult = (
  result: UpdateMyProfileResult | null
): Effect.Effect<Profile, InvalidProfileDataError> =>
  result
    ? mapCurrentProfile(result)
    : Effect.fail(
        new InvalidProfileDataError({
          cause: 'The profile update returned no profile version.',
        })
      );
