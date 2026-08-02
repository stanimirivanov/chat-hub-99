import { Schema } from 'effect';

import { ChannelIdSchema } from '@chat-hub/domain/channel';
import { ProfileIdSchema, type ProfileId } from '@chat-hub/domain/profile';
import type { CurrentMessage, TableRow } from '@chat-hub/shared/database';
import {
  ActiveMessageSchema,
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

export const authorId: ProfileId = Schema.decodeUnknownSync(ProfileIdSchema)(
  '00000000-0000-4000-8000-000000000010'
);

export const activeMessageRow: CurrentMessage = {
  author_user_id: authorId,
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

export const messageRevisionRow: TableRow<'message_versions'> = {
  message_version_id: '00000000-0000-4000-8000-000000000040',
  message_id: messageId,
  version_number: 2,
  content: 'Edited message content',
  created_by: authorId,
  created_at: '2026-07-26T19:00:00.000Z',
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
  readonly authorId?: string;
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
    authorId: overrides.authorId ?? authorId,
    status: 'active',
    content: overrides.content ?? 'Hello',
    createdAt: overrides.createdAt ?? new Date('2026-07-26T18:00:00.000Z'),
    editedAt: overrides.editedAt ?? null,
  });
