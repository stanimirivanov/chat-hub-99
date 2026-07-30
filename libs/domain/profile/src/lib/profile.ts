import { Schema } from 'effect';
import { ProfileIdSchema } from './profile-id';

const OptionalUsernameSchema = Schema.NullOr(Schema.NonEmptyTrimmedString);
const OptionalAvatarUrlSchema = Schema.NullOr(Schema.NonEmptyTrimmedString);

/**
 * Current profile projection displayed at authenticated application entry.
 */
export const ProfileSchema = Schema.Struct({
  id: ProfileIdSchema,
  username: OptionalUsernameSchema,
  displayName: Schema.NonEmptyTrimmedString,
  avatarUrl: OptionalAvatarUrlSchema,
  status: Schema.Literal('active', 'deactivated', 'banned'),
});

export type Profile = typeof ProfileSchema.Type;
