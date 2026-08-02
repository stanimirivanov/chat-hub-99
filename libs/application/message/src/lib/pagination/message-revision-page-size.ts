import { Schema } from 'effect';

/** Supported number of revisions requested in one repository page. */
export const MessageRevisionPageSizeSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.between(1, 100),
  Schema.brand('MessageRevisionPageSize')
);

export type MessageRevisionPageSize = typeof MessageRevisionPageSizeSchema.Type;
