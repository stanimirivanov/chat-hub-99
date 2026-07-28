import type { MessageId } from '@chat-hub/domain/message';

/** Input accepted by the edit-message use case before content validation. */
export interface EditMessageInput {
  readonly messageId: MessageId;
  readonly content: string;
}
