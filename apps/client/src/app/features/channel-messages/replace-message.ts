import type { MessagePage } from '@chat-hub/application/message';

type Message = MessagePage['messages'][number];

/** Replaces one current projection while preserving newest-first ordering. */
export const replaceMessage = (
  current: readonly Message[],
  replacement: Message
): readonly Message[] =>
  current.map((message) =>
    message.id === replacement.id ? replacement : message
  );
