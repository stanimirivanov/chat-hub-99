import { Effect, Schema } from 'effect';
import {
  AvatarUrlSchema,
  type AvatarUrl,
  type Profile,
} from '@omoikane/domain/profile';
import {
  ProfileRepositoryTag,
  type ProfileRepository,
  type UpdateCurrentProfileCommand,
} from '../repository';
import {
  InvalidProfileUpdateInputError,
  type ProfileUpdateField,
  type UpdateCurrentProfileError,
} from './update-current-profile-error';

const DisplayNameSchema = Schema.Trim.pipe(Schema.nonEmptyString());
const decodeDisplayName = Schema.decodeUnknown(DisplayNameSchema);
const decodeTrimmedString = Schema.decodeUnknown(Schema.Trim);
const decodeAvatarUrlValue = Schema.decodeUnknown(AvatarUrlSchema);

const readInputField = (input: unknown, field: ProfileUpdateField): unknown =>
  typeof input === 'object' && input !== null
    ? Reflect.get(input, field)
    : undefined;

const invalidField = (
  field: ProfileUpdateField,
  cause: unknown
): InvalidProfileUpdateInputError =>
  new InvalidProfileUpdateInputError({ field, cause });

const decodeOptionalUsername = (
  input: unknown
): Effect.Effect<string | null, InvalidProfileUpdateInputError> =>
  decodeTrimmedString(readInputField(input, 'username') ?? '').pipe(
    Effect.map((value) => (value.length === 0 ? null : value)),
    Effect.mapError((cause) => invalidField('username', cause))
  );

const decodeOptionalAvatarUrl = (
  input: unknown
): Effect.Effect<AvatarUrl | null, InvalidProfileUpdateInputError> =>
  decodeTrimmedString(readInputField(input, 'avatarUrl') ?? '').pipe(
    Effect.flatMap((value) =>
      value.length === 0 ? Effect.succeed(null) : decodeAvatarUrlValue(value)
    ),
    Effect.mapError((cause) => invalidField('avatarUrl', cause))
  );

/**
 * Updates the authenticated user's editable profile fields.
 *
 * Runtime decoding rejects missing, null, non-string, and blank display names.
 * Optional username and avatar values are trimmed, with missing, null, and
 * blank values normalized to `null`. Account status is intentionally absent
 * because self-service profile updates cannot change lifecycle state.
 *
 * @returns An Effect whose success value is the canonical updated profile,
 * whose typed failure is validation or repository failure, and whose
 * requirement is the profile repository port.
 */
export const updateCurrentProfile = (
  input: unknown
): Effect.Effect<Profile, UpdateCurrentProfileError, ProfileRepository> =>
  Effect.gen(function* () {
    const displayName = yield* decodeDisplayName(
      readInputField(input, 'displayName')
    ).pipe(Effect.mapError((cause) => invalidField('displayName', cause)));
    const username = yield* decodeOptionalUsername(input);
    const avatarUrl = yield* decodeOptionalAvatarUrl(input);

    const command: UpdateCurrentProfileCommand = {
      displayName,
      username,
      avatarUrl,
    };

    const repository = yield* ProfileRepositoryTag;
    return yield* repository.updateCurrent(command);
  });
