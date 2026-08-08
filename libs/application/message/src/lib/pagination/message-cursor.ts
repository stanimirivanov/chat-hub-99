import type { MessageId } from '@omoikane/domain/message';

/**
 * Stable keyset-pagination cursor for a message page.
 */
export interface MessageCursor {
  readonly createdAt: Date;
  readonly messageId: MessageId;
}
