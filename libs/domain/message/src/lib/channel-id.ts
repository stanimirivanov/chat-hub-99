import { Schema } from 'effect';

// prettier-ignore
export const ChannelIdSchema = Schema.UUID.pipe(
  Schema.brand('ChannelId')
);

export type ChannelId = typeof ChannelIdSchema.Type;
