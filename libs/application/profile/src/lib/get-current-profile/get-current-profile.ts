import { Effect, Schema } from 'effect';
import { ProfileIdSchema, type Profile } from '@chat-hub/domain/profile';
import { ProfileRepositoryTag, type ProfileRepository } from '../repository';
import {
  CurrentProfileNotFoundError,
  InvalidCurrentProfileInputError,
  type GetCurrentProfileError,
} from './get-current-profile-error';

const GetCurrentProfileInputSchema = Schema.Struct({
  userId: ProfileIdSchema,
});

/**
 * Loads the current profile projection for an authenticated user identity.
 *
 * Unknown boundary input is decoded before repository access. The Effect fails
 * with typed validation, not-found, or repository errors and requires
 * `ProfileRepository` to be supplied.
 */
export const getCurrentProfile = (
  input: unknown
): Effect.Effect<Profile, GetCurrentProfileError, ProfileRepository> =>
  Effect.gen(function* () {
    const { userId } = yield* Schema.decodeUnknown(
      GetCurrentProfileInputSchema
    )(input).pipe(
      Effect.mapError(
        (cause) =>
          new InvalidCurrentProfileInputError({
            cause,
          })
      )
    );

    const repository = yield* ProfileRepositoryTag;
    const profile = yield* repository.findCurrentById(userId);

    if (profile === null) {
      return yield* new CurrentProfileNotFoundError({
        profileId: userId,
      });
    }

    return profile;
  });
