import { Schema } from 'effect';

import {
  ActiveMessageSchema,
  type ActiveMessage,
  ChannelIdSchema,
  CreateMessageCommandSchema,
  DeleteMessageCommandSchema,
  EditMessageCommandSchema,
  MessageIdSchema,
  type CreateMessageCommand,
  type DeleteMessageCommand,
  type EditMessageCommand,
  type MessageId,
} from '@chat-hub/domain/message';
import type { CurrentMessage } from '@chat-hub/shared/database';

/**
 * Stable identifiers used by infrastructure unit tests.
 *
 * Fixed UUID values make assertions deterministic while still passing through
 * the same domain validation used by production code.
 */
export const messageId: MessageId = Schema.decodeUnknownSync(MessageIdSchema)(
  '00000000-0000-4000-8000-000000000030'
);

export const channelId = Schema.decodeUnknownSync(ChannelIdSchema)(
  '00000000-0000-4000-8000-000000000020'
);

export const activeMessageRow: CurrentMessage = {
  author_user_id: '00000000-0000-4000-8000-000000000010',
  channel_id: channelId,
  content: 'Hello',
  created_at: '2026-07-26T18:00:00.000Z',
  deleted_at: null,
  deleted_by: null,
  is_edited: false,
  message_id: messageId,
  message_status: 'active',
  message_version_id: '00000000-0000-4000-8000-000000000040',
  updated_at: '2026-07-26T18:00:00.000Z',
  version_created_at: '2026-07-26T18:00:00.000Z',
  version_created_by: '00000000-0000-4000-8000-000000000010',
  version_number: 1,
  workspace_id: '00000000-0000-4000-8000-000000000050',
};

export const createMessageCommand: CreateMessageCommand =
  Schema.decodeUnknownSync(CreateMessageCommandSchema)({
    channelId,
    content: 'Hello from the repository',
  });

export const editMessageCommand: EditMessageCommand = Schema.decodeUnknownSync(
  EditMessageCommandSchema
)({
  messageId,
  content: 'Edited message content',
});

export const deleteMessageCommand: DeleteMessageCommand =
  Schema.decodeUnknownSync(DeleteMessageCommandSchema)({
    messageId,
  });

export const makeActiveMessage = (
  overrides: Partial<{
    readonly id: string;
    readonly channelId: string;
    readonly content: string;
    readonly createdAt: Date;
    readonly editedAt: Date | null;
  }> = {}
): ActiveMessage =>
  Schema.decodeUnknownSync(ActiveMessageSchema)({
    id: overrides.id ?? '00000000-0000-4000-8000-000000000030',
    channelId: overrides.channelId ?? '00000000-0000-4000-8000-000000000020',
    status: 'active',
    content: overrides.content ?? 'Hello',
    createdAt: overrides.createdAt ?? new Date('2026-07-26T18:00:00.000Z'),
    editedAt: overrides.editedAt ?? null,
  });
