import type { MessagePage } from '@chat-hub/application/message';

type Message = MessagePage['messages'][number];

/**
 * Prepends a message unless its stable identifier is already present.
 */
export const prependUniqueMessage = (
  current: readonly Message[],
  incoming: Message
): readonly Message[] =>
  current.some((message) => message.id === incoming.id)
    ? current
    : [incoming, ...current];
