import { Either } from 'effect';
import { describe, expect, it } from 'vitest';
import { channelId, messageId } from '../testing';
import { mapMessageHeadChange } from './map-message-head-change';

describe('mapMessageHeadChange', () => {
  it.each([
    ['INSERT', 'created'],
    ['UPDATE', 'updated'],
  ] as const)('maps %s events to %s notifications', (eventType, kind) => {
    const result = mapMessageHeadChange(
      {
        eventType,
        new: {
          message_id: messageId,
          channel_id: channelId,
        },
      },
      channelId
    );

    expect(result).toEqual(
      Either.right({
        kind,
        messageId,
      })
    );
  });

  it.each([
    ['null payload', null],
    ['unsupported event', { eventType: 'DELETE', new: {} }],
    [
      'invalid message identity',
      {
        eventType: 'INSERT',
        new: { message_id: '', channel_id: channelId },
      },
    ],
    [
      'misrouted channel',
      {
        eventType: 'UPDATE',
        new: {
          message_id: messageId,
          channel_id: '00000000-0000-4000-8000-000000000099',
        },
      },
    ],
  ])('rejects %s', (_label, payload) => {
    const result = mapMessageHeadChange(payload, channelId);

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidMessageDataError');
    }
  });
});
