import { Schema } from 'effect';

import type { CurrentMessage } from '@chat-hub/shared/database';
import {
  ActiveMessageSchema,
  ChannelIdSchema,
  MessageContentSchema,
  MessageIdSchema,
  type ActiveMessage,
  type MessageId,
} from '@chat-hub/domain/message';
import type {
  CreateMessageCommand,
  DeleteMessageCommand,
  EditMessageCommand,
} from '@chat-hub/application/message';

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

const createMessageContent = Schema.decodeUnknownSync(MessageContentSchema)(
  'Hello from the repository'
);

const editedMessageContent = Schema.decodeUnknownSync(MessageContentSchema)(
  'Edited message content'
);

export const createMessageCommand: CreateMessageCommand = {
  channelId,
  content: createMessageContent,
};

export const editMessageCommand: EditMessageCommand = {
  messageId,
  content: editedMessageContent,
};

export const deleteMessageCommand: DeleteMessageCommand = {
  messageId,
};

interface ActiveMessageFixtureOverrides {
  readonly id?: string;
  readonly channelId?: string;
  readonly content?: string;
  readonly createdAt?: Date;
  readonly editedAt?: Date | null;
}

export const makeActiveMessage = (
  overrides: ActiveMessageFixtureOverrides = {}
): ActiveMessage =>
  Schema.decodeUnknownSync(ActiveMessageSchema)({
    id: overrides.id ?? messageId,
    channelId: overrides.channelId ?? channelId,
    status: 'active',
    content: overrides.content ?? 'Hello',
    createdAt: overrides.createdAt ?? new Date('2026-07-26T18:00:00.000Z'),
    editedAt: overrides.editedAt ?? null,
  });
