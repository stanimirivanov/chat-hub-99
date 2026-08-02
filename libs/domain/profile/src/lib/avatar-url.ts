import { Schema } from 'effect';

/** Maximum persisted length of an externally hosted profile-avatar URL. */
export const AVATAR_URL_MAX_LENGTH = 2048;

/**
 * Conservative URL syntax supported for externally hosted profile avatars.
 *
 * Only lowercase HTTPS URLs without embedded credentials are accepted. The
 * domain deliberately models a validated string rather than the runtime-bound
 * `URL` class so it remains usable without DOM or Node ambient APIs.
 */
export const AvatarUrlSchema = Schema.NonEmptyTrimmedString.pipe(
  Schema.maxLength(AVATAR_URL_MAX_LENGTH),
  Schema.pattern(/^https:\/\/[^\s/?#:@]+(?::[0-9]{1,5})?(?:[/?#]\S*)?$/),
  Schema.brand('AvatarUrl')
);

export type AvatarUrl = typeof AvatarUrlSchema.Type;
