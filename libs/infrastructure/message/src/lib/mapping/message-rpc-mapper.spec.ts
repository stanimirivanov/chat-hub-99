import { describe, expect, it } from 'vitest';

import {
  toCreateMessageArgs,
  toDeleteMessageArgs,
  toEditMessageArgs,
} from './message-rpc-mapper';
import {
  createMessageCommand,
  deleteMessageCommand,
  editMessageCommand,
} from '../testing/message-fixtures';

describe('message RPC mapper', () => {
  it('maps a create-message command', () => {
    expect(toCreateMessageArgs(createMessageCommand)).toEqual({
      p_channel_id: createMessageCommand.channelId,
      p_content: createMessageCommand.content,
    });
  });

  it('maps an edit-message command', () => {
    expect(toEditMessageArgs(editMessageCommand)).toEqual({
      p_message_id: editMessageCommand.messageId,
      p_content: editMessageCommand.content,
    });
  });

  it('maps a delete-message command', () => {
    expect(toDeleteMessageArgs(deleteMessageCommand)).toEqual({
      p_message_id: editMessageCommand.messageId,
    });
  });
});
