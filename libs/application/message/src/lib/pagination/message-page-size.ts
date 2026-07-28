import { Schema } from 'effect';

/**
 * Supported number of messages requested in one repository page.
 */
export const MessagePageSizeSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.between(1, 100),
  Schema.brand('MessagePageSize')
);

export type MessagePageSize = typeof MessagePageSizeSchema.Type;
