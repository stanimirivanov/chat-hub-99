import { Effect, Schema } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { ChannelIdSchema } from '@omoikane/domain/channel';
import {
  emptyChannelTypingConnection,
  makeChannelTypingServiceLayer,
} from '../testing';
import { connectChannelTyping } from './connect-channel-typing';

const channelId = Schema.decodeUnknownSync(ChannelIdSchema)(
  '00000000-0000-4000-8000-000000000001'
);

describe('connectChannelTyping', () => {
  it('validates the channel and delegates the scoped connection', async () => {
    const connect = vi.fn(() => Effect.succeed(emptyChannelTypingConnection));

    const connection = await Effect.runPromise(
      connectChannelTyping({ channelId }).pipe(
        Effect.provide(makeChannelTypingServiceLayer({ connect })),
        Effect.scoped
      )
    );

    expect(connection).toBe(emptyChannelTypingConnection);
    expect(connect).toHaveBeenCalledExactlyOnceWith(channelId);
  });

  it.each([undefined, null, {}, { channelId: null }, { channelId: '' }])(
    'rejects invalid input before connecting: %j',
    async (input) => {
      const connect = vi.fn(() => Effect.succeed(emptyChannelTypingConnection));
      const result = await Effect.runPromise(
        connectChannelTyping(input).pipe(
          Effect.provide(makeChannelTypingServiceLayer({ connect })),
          Effect.scoped,
          Effect.either
        )
      );

      expect(result).toMatchObject({
        _tag: 'Left',
        left: { _tag: 'InvalidChannelTypingInputError', field: 'channelId' },
      });
      expect(connect).not.toHaveBeenCalled();
    }
  );
});
