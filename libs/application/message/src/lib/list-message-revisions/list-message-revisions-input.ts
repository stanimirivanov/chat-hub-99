import type {
  MessageId,
  MessageRevisionNumber,
} from '@omoikane/domain/message';

/** Pagination cursor accepted by the list-message-revisions use case. */
export interface ListMessageRevisionsCursorInput {
  readonly versionNumber: MessageRevisionNumber;
}

/** Input accepted by the list-message-revisions use case. */
export interface ListMessageRevisionsInput {
  readonly messageId: MessageId;
  readonly limit?: number;
  readonly before?: ListMessageRevisionsCursorInput;
}
