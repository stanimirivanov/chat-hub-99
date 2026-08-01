import { Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  InvalidEditedMessageContentError,
  InvalidMessageContentError,
  InvalidMessageDataError,
  InvalidMessagePageLimitError,
  MessageAccessDeniedError,
  MessageContentUnchangedError,
  MessageCreationNotAllowedError,
  MessageMutationNotAllowedError,
  MessageNotFoundError,
  MessageRepositoryUnavailableError,
} from '@chat-hub/application/message';
import { ChannelIdSchema } from '@chat-hub/domain/channel';
import { MessageIdSchema } from '@chat-hub/domain/message';
import { toChannelMessagesError } from './to-channel-messages-error';

const cause = new Error('Sensitive provider detail');
const messageId = Schema.decodeUnknownSync(MessageIdSchema)(
  '00000000-0000-4000-8000-000000000001'
);
const channelId = Schema.decodeUnknownSync(ChannelIdSchema)(
  '00000000-0000-4000-8000-000000000020'
);

describe('toChannelMessagesError', () => {
  it.each([
    [
      new InvalidMessageContentError({ cause }),
      'The message content is invalid.',
    ],
    [
      new MessageCreationNotAllowedError({ channelId }),
      'Messages can no longer be sent to this channel.',
    ],
    [
      new InvalidEditedMessageContentError({ cause }),
      'The edited message content is invalid.',
    ],
    [
      new MessageContentUnchangedError({ messageId }),
      'Change the message before saving.',
    ],
    [
      new MessageMutationNotAllowedError({
        messageId,
        operation: 'edit',
      }),
      'This message can no longer be edited.',
    ],
    [
      new MessageMutationNotAllowedError({
        messageId,
        operation: 'delete',
      }),
      'This message can no longer be deleted.',
    ],
    [
      new MessageNotFoundError({ messageId }),
      'The message could not be found.',
    ],
    [
      new MessageAccessDeniedError({ operation: 'edit' }),
      'You do not have permission to perform this message action.',
    ],
    [
      new InvalidMessagePageLimitError({ limit: 0, cause }),
      'Channel messages are currently unavailable. Please try again.',
    ],
    [
      new MessageRepositoryUnavailableError({
        operation: 'read',
        cause,
      }),
      'Channel messages are currently unavailable. Please try again.',
    ],
    [
      new InvalidMessageDataError({ cause }),
      'Channel messages are currently unavailable. Please try again.',
    ],
  ])('maps $._tag without exposing its cause', (error, expectedMessage) => {
    const result = toChannelMessagesError(error);

    expect(result).toEqual({
      tag: error._tag,
      message: expectedMessage,
    });
    expect(result.message).not.toContain(cause.message);
  });
});
