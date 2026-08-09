import { Effect, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { ChannelIdSchema } from '@omoikane/domain/channel';
import {
  activeMessage,
  messageId,
  makeMessageRepositoryLayer,
} from '../testing';
import { getChannelMessage } from './get-channel-message';

describe('getChannelMessage', () => {
  it('returns an RLS-visible message in the selected channel', async () => {
    const result = await Effect.runPromise(
      getChannelMessage({
        channelId: activeMessage.channelId,
        messageId,
      }).pipe(
        Effect.provide(
          makeMessageRepositoryLayer({
            findById: () => Effect.succeed(activeMessage),
          })
        )
      )
    );

    expect(result).toEqual(activeMessage);
  });

  it('does not disclose a message through a mismatched channel route', async () => {
    const otherChannelId = Schema.decodeUnknownSync(ChannelIdSchema)(
      '00000000-0000-4000-8000-000000000099'
    );

    const error = await Effect.runPromise(
      getChannelMessage({ channelId: otherChannelId, messageId }).pipe(
        Effect.provide(
          makeMessageRepositoryLayer({
            findById: () => Effect.succeed(activeMessage),
          })
        ),
        Effect.flip
      )
    );

    expect(error).toMatchObject({
      _tag: 'MessageNotFoundError',
      messageId,
    });
  });
});
