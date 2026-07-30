import { Schema } from 'effect';

/**
 * Stable application-profile identity backed by the authentication user UUID.
 */
export const ProfileIdSchema = Schema.UUID.pipe(Schema.brand('ProfileId'));

export type ProfileId = typeof ProfileIdSchema.Type;
