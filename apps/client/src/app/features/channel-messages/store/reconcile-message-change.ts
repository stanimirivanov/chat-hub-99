import type { MessageChange } from '@chat-hub/application/message';
import type { Message } from '@chat-hub/domain/message';
import { replaceMessage } from './replace-message';

/**
 * Reconciles one realtime projection into a newest-first loaded page.
 *
 * Creates prepend new identities and replace optimistic local duplicates.
 * Updates replace only messages already in the loaded page, preventing an edit
 * to an older unloaded message from appearing as a new latest message.
 */
export const reconcileMessageChange = (
  current: readonly Message[],
  change: MessageChange
): readonly Message[] => {
  const exists = current.some((message) => message.id === change.message.id);

  if (exists) {
    return replaceMessage(current, change.message);
  }

  return change.kind === 'created' ? [change.message, ...current] : current;
};
