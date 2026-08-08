import type { MessageRepository } from '@omoikane/application/message';

import { createMessage, deleteMessage, editMessage } from './commands';
import { findMessageById } from './queries/find-message-by-id';
import { listMessagesByChannel } from './queries/list-messages-by-channel';
import { listMessageRevisions } from './queries/list-message-revisions';
import { makeMessageChangesStream } from './realtime';
import type { SupabaseMessageClient } from './supabase-message-client';

/**
 * Assembles the Supabase-backed operations into the application-level message
 * repository port.
 *
 * Individual modules own database interaction and mapping. This function owns
 * only composition and introduces no additional runtime behavior.
 */
export const makeSupabaseMessageRepository = (
  client: SupabaseMessageClient
): MessageRepository => ({
  create: (command) => createMessage(client, command),
  edit: (command) => editMessage(client, command),
  delete: (command) => deleteMessage(client, command),
  findById: (messageId) => findMessageById(client, messageId),
  listByChannel: (query) => listMessagesByChannel(client, query),
  listRevisions: (query) => listMessageRevisions(client, query),
  changesByChannel: (channelId) => makeMessageChangesStream(client, channelId),
});
