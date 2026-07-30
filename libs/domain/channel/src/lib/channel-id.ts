import { Schema } from 'effect';

/**
 * Stable branded identity shared by channel-owned contracts and consumers.
 */
export const ChannelIdSchema = Schema.UUID.pipe(Schema.brand('ChannelId'));

export type ChannelId = typeof ChannelIdSchema.Type;
