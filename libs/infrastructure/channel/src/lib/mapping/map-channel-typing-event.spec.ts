import { Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { ChannelIdSchema } from '@omoikane/domain/channel';
import { mapChannelTypingEvent } from './map-channel-typing-event';

const channelId = Schema.decodeUnknownSync(ChannelIdSchema)(
  '00000000-0000-4000-8000-000000000001'
);

describe('mapChannelTypingEvent', () => {
  it('maps a valid channel-scoped event', () => {
    expect(
      mapChannelTypingEvent(
        {
          payload: {
            channelId,
            profileId: '10000000-0000-4000-8000-000000000001',
            isTyping: true,
          },
        },
        channelId
      )
    ).toMatchObject({ _tag: 'Right', right: { isTyping: true } });
  });

  it('rejects malformed or cross-channel events', () => {
    expect(Either.isLeft(mapChannelTypingEvent(null, channelId))).toBe(true);
    expect(
      Either.isLeft(
        mapChannelTypingEvent(
          {
            payload: {
              channelId: '00000000-0000-4000-8000-000000000002',
              profileId: '10000000-0000-4000-8000-000000000001',
              isTyping: true,
            },
          },
          channelId
        )
      )
    ).toBe(true);
  });
});
