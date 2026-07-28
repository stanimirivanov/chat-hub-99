import type { MessageRepository } from '@chat-hub/application/message';

import { createMessage, deleteMessage, editMessage } from './commands';
import { findMessageById } from './queries/find-message-by-id';
import { listMessagesByChannel } from './queries/list-messages-by-channel';
import type { ChatHubSupabaseClient } from './supabase-message-client';

/**
 * Assembles the Supabase-backed operations into the application-level message
 * repository port.
 *
 * Individual modules own database interaction and mapping. This function owns
 * only composition and introduces no additional runtime behavior.
 */
export const makeSupabaseMessageRepository = (
  client: ChatHubSupabaseClient
): MessageRepository => ({
  create: (command) => createMessage(client, command),
  edit: (command) => editMessage(client, command),
  delete: (command) => deleteMessage(client, command),
  findById: (messageId) => findMessageById(client, messageId),
  listByChannel: (query) => listMessagesByChannel(client, query),
});
