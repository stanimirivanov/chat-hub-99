import type { Message } from '@chat-hub/domain/message';
import type { MessageCursor } from './message-cursor';

/**
 * One newest-first page of messages and the cursor for the next older page.
 */
export interface MessagePage {
  readonly messages: readonly Message[];
  readonly nextCursor: MessageCursor | null;
}
