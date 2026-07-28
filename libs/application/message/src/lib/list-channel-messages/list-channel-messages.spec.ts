import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';

import type { MessagePage } from '../pagination/message-page';
import { listChannelMessages } from './list-channel-messages';
import {
  messageId,
  channelId,
  makeListByChannelRepository,
  makeMessageRepositoryLayer,
} from '../testing';

const emptyPage: MessagePage = {
  messages: [],
  nextCursor: null,
};

describe('listChannelMessages', () => {
  it('uses the default page size', async () => {
    const { listByChannel, repositoryLayer } = makeListByChannelRepository(() =>
      Effect.succeed(emptyPage)
    );

    const result = await Effect.runPromise(
      listChannelMessages({
        channelId,
      }).pipe(Effect.provide(repositoryLayer))
    );

    expect(result).toEqual(emptyPage);

    expect(listByChannel).toHaveBeenCalledOnce();

    expect(listByChannel).toHaveBeenCalledWith({
      channelId,
      limit: 50,
      before: undefined,
    });
  });

  it('passes an explicit valid page size', async () => {
    const { listByChannel, repositoryLayer } = makeListByChannelRepository(() =>
      Effect.succeed(emptyPage)
    );

    await Effect.runPromise(
      listChannelMessages({
        channelId,
        limit: 25,
      }).pipe(Effect.provide(repositoryLayer))
    );

    expect(listByChannel).toHaveBeenCalledOnce();

    expect(listByChannel).toHaveBeenCalledWith({
      channelId,
      limit: 25,
      before: undefined,
    });
  });

  it.each([0, -1, 101, 10.5])('rejects invalid page size %s', async (limit) => {
    const { listByChannel, repositoryLayer } = makeListByChannelRepository(() =>
      Effect.succeed(emptyPage)
    );

    const error = await Effect.runPromise(
      listChannelMessages({
        channelId,
        limit,
      }).pipe(Effect.provide(repositoryLayer), Effect.flip)
    );

    expect(error).toMatchObject({
      _tag: 'InvalidMessagePageLimitError',
      limit,
    });

    expect(listByChannel).not.toHaveBeenCalled();
  });

  it('passes the pagination cursor to the repository', async () => {
    const before = {
      createdAt: new Date('2026-07-26T08:00:00.000Z'),
      messageId,
    };

    const { listByChannel } = makeListByChannelRepository(() =>
      Effect.succeed(emptyPage)
    );

    await Effect.runPromise(
      listChannelMessages({
        channelId,
        limit: 25,
        before,
      }).pipe(
        Effect.provide(
          makeMessageRepositoryLayer({
            listByChannel,
          })
        )
      )
    );

    expect(listByChannel).toHaveBeenCalledExactlyOnceWith({
      channelId,
      limit: 25,
      before,
    });
  });
});
