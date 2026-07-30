import { Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  InvalidEditedMessageContentError,
  InvalidMessageContentError,
  InvalidMessageDataError,
  InvalidMessagePageLimitError,
  MessageAccessDeniedError,
  MessageNotFoundError,
  MessageRepositoryUnavailableError,
} from '@chat-hub/application/message';
import { MessageIdSchema } from '@chat-hub/domain/message';
import { toChannelMessagesError } from './to-channel-messages-error';

const cause = new Error('Sensitive provider detail');
const messageId = Schema.decodeUnknownSync(MessageIdSchema)(
  '00000000-0000-4000-8000-000000000001'
);

describe('toChannelMessagesError', () => {
  it.each([
    [
      new InvalidMessageContentError({ cause }),
      'The message content is invalid.',
    ],
    [
      new InvalidEditedMessageContentError({ cause }),
      'The edited message content is invalid.',
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
