import type { MessageRevisionNumber } from '@chat-hub/domain/message';

/** Cursor for the next older page of one message's immutable revisions. */
export interface MessageRevisionCursor {
  readonly versionNumber: MessageRevisionNumber;
}
