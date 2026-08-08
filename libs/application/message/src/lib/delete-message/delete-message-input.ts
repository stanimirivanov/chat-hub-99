import type { MessageId } from '@omoikane/domain/message';

/**
 * Input accepted by the delete-message use case.
 */
export interface DeleteMessageInput {
  readonly messageId: MessageId;
}
