import type { MessageRevisionNumber } from '@omoikane/domain/message';

/** Cursor for the next older page of one message's immutable revisions. */
export interface MessageRevisionCursor {
  readonly versionNumber: MessageRevisionNumber;
}
