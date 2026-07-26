import { Schema } from 'effect';

// prettier-ignore
export const MessageIdSchema = Schema.UUID.pipe(
  Schema.brand('MessageId'),
);

export type MessageId = typeof MessageIdSchema.Type;
