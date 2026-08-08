import type { Message } from '@omoikane/domain/message';

/**
 * Authoritative current message projection produced by the observation use
 * case after a repository change notification.
 */
export interface MessageChange {
  readonly kind: 'created' | 'updated';
  readonly message: Message;
}
