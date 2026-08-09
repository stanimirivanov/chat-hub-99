import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { markChannelRead } from './mark-channel-read';
import { channelId, makeUnreadRepository, messageId } from '../testing';

describe('markChannelRead', () => {
  it('advances the repository position for the selected channel', async () => {
    const { markRead, repositoryLayer } = makeUnreadRepository({
      markRead: () => Effect.void,
    });

    await Effect.runPromise(
      markChannelRead({ channelId, messageId }).pipe(
        Effect.provide(repositoryLayer)
      )
    );

    expect(markRead).toHaveBeenCalledWith({ channelId, messageId });
  });
});
