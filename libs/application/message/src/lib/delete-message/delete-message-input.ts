import type { MessageId } from '@chat-hub/domain/message';

/**
 * Input accepted by the delete-message use case.
 */
export interface DeleteMessageInput {
  readonly messageId: MessageId;
}
