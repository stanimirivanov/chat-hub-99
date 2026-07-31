import type { MessageId } from '@chat-hub/domain/message';

/**
 * Technology-independent notification that one message projection changed.
 *
 * The repository reports only stable identity and change kind. The observing
 * use case loads the authoritative current projection through the ordinary
 * repository query path.
 */
export interface MessageChangeNotification {
  readonly kind: 'created' | 'updated';
  readonly messageId: MessageId;
}
