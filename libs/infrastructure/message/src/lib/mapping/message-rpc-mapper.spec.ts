import { describe, expect, it } from 'vitest';
import { Schema } from 'effect';
import {
  CreateMessageCommandSchema,
  DeleteMessageCommandSchema,
  EditMessageCommandSchema,
} from '@chat-hub/domain/message';
import {
  toCreateMessageArgs,
  toDeleteMessageArgs,
  toEditMessageArgs,
} from './message-rpc-mapper';

describe('message RPC mapper', () => {
  it('maps a create-message command', () => {
    const command = Schema.decodeUnknownSync(CreateMessageCommandSchema)({
      channelId: '00000000-0000-4000-8000-000000000001',
      content: 'Hello',
    });

    expect(toCreateMessageArgs(command)).toEqual({
      p_channel_id: '00000000-0000-4000-8000-000000000001',
      p_content: 'Hello',
    });
  });

  it('maps an edit-message command', () => {
    const command = Schema.decodeUnknownSync(EditMessageCommandSchema)({
      messageId: '00000000-0000-4000-8000-000000000002',
      content: 'Updated message',
    });

    expect(toEditMessageArgs(command)).toEqual({
      p_message_id: '00000000-0000-4000-8000-000000000002',
      p_content: 'Updated message',
    });
  });

  it('maps a delete-message command', () => {
    const command = Schema.decodeUnknownSync(DeleteMessageCommandSchema)({
      messageId: '00000000-0000-4000-8000-000000000003',
    });

    expect(toDeleteMessageArgs(command)).toEqual({
      p_message_id: '00000000-0000-4000-8000-000000000003',
    });
  });
});
