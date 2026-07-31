import { Effect, Schema } from 'effect';
import { ProfileIdSchema, type Profile } from '@chat-hub/domain/profile';
import { ProfileRepositoryTag, type ProfileRepository } from '../repository';
import {
  InvalidCurrentProfilesInputError,
  type ListCurrentProfilesError,
} from './list-current-profiles-error';

const ListCurrentProfilesInputSchema = Schema.Struct({
  profileIds: Schema.Array(ProfileIdSchema),
});

/**
 * Lists current RLS-visible profiles for a collection of stable identities.
 *
 * Unknown boundary input is validated and duplicate identities are removed
 * before repository access. An empty collection succeeds without querying the
 * repository. The returned Effect can fail with input or repository errors and
 * requires `ProfileRepository` to be supplied.
 */
export const listCurrentProfiles = (
  input: unknown
): Effect.Effect<
  readonly Profile[],
  ListCurrentProfilesError,
  ProfileRepository
> =>
  Effect.gen(function* () {
    const { profileIds } = yield* Schema.decodeUnknown(
      ListCurrentProfilesInputSchema
    )(input).pipe(
      Effect.mapError(
        (cause) =>
          new InvalidCurrentProfilesInputError({
            cause,
          })
      )
    );

    const uniqueProfileIds = [...new Set(profileIds)];

    if (uniqueProfileIds.length === 0) {
      return [];
    }

    const repository = yield* ProfileRepositoryTag;
    return yield* repository.listCurrentByIds(uniqueProfileIds);
  });
