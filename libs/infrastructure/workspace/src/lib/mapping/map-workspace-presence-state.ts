import { Either, Schema } from 'effect';
import { ProfileIdSchema, type ProfileId } from '@omoikane/domain/profile';
import { WorkspacePresenceUnavailableError } from '@omoikane/application/workspace';

const PresenceStateSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Array(Schema.Unknown),
});

/**
 * Maps provider Presence keys into a stable, distinct profile-id snapshot.
 *
 * The outer state shape is validated. Invalid individual keys are ignored so
 * one malformed advisory entry cannot disconnect every legitimate observer.
 * Presence remains display-only and is never an authorization source.
 */
export const mapWorkspacePresenceState = (
  state: unknown
): Either.Either<readonly ProfileId[], WorkspacePresenceUnavailableError> =>
  Schema.decodeUnknownEither(PresenceStateSchema)(state).pipe(
    Either.mapLeft((cause) => new WorkspacePresenceUnavailableError({ cause })),
    Either.map((presenceState) => {
      const profileIds = Object.keys(presenceState).flatMap((key) => {
        const decoded = Schema.decodeUnknownEither(ProfileIdSchema)(key);
        return Either.isRight(decoded) ? [decoded.right] : [];
      });

      return [...new Set(profileIds)].sort();
    })
  );
