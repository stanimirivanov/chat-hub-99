import { Schema } from 'effect';

// prettier-ignore
export const MessageRevisionIdSchema = Schema.UUID.pipe(
  Schema.brand('MessageRevisionId'),
);

export type MessageRevisionId = typeof MessageRevisionIdSchema.Type;
