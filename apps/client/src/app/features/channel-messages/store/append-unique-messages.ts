import type { MessagePage } from '@omoikane/application/message';

type Message = MessagePage['messages'][number];

/**
 * Appends older messages without introducing duplicate message IDs.
 */
export const appendUniqueMessages = (
  current: readonly Message[],
  incoming: readonly Message[]
): readonly Message[] => {
  const knownIds = new Set(current.map((message) => message.id));

  return [
    ...current,
    ...incoming.filter((message) => !knownIds.has(message.id)),
  ];
};
