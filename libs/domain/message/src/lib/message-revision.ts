import { Schema } from 'effect';
import { ProfileIdSchema } from '@omoikane/domain/profile';
import { MessageContentSchema } from './message-content';
import { MessageIdSchema } from './message-id';
import { MessageRevisionIdSchema } from './message-revision-id';

/** Monotonic revision number scoped to one stable message identity. */
export const MessageRevisionNumberSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.between(1, Number.MAX_SAFE_INTEGER),
  Schema.brand('MessageRevisionNumber')
);

export type MessageRevisionNumber = typeof MessageRevisionNumberSchema.Type;

/** One immutable content revision belonging to a message. */
export const MessageRevisionSchema = Schema.Struct({
  id: MessageRevisionIdSchema,
  messageId: MessageIdSchema,
  versionNumber: MessageRevisionNumberSchema,
  content: MessageContentSchema,
  createdBy: ProfileIdSchema,
  createdAt: Schema.DateFromSelf,
});

export type MessageRevision = typeof MessageRevisionSchema.Type;
