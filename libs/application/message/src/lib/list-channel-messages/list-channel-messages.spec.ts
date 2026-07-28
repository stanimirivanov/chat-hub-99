import { Effect, Layer } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import type { ChannelId } from '@chat-hub/domain/message';
import type { MessagePage } from '../pagination/message-page';
import type { MessageRepository } from '../repository/message-repository';
import { MessageRepositoryTag } from '../repository/message-repository';
import { listChannelMessages } from './list-channel-messages';
import { messageId } from '../testing/message-application-fixtures';
import { makeMessageRepositoryLayer } from '../testing/message-repository.stub';

const channelId = '00000000-0000-4000-8000-000000000001' as ChannelId;

const emptyPage: MessagePage = {
  messages: [],
  nextCursor: null,
};

const makeRepositoryLayer = (
  listByChannel: MessageRepository['listByChannel']
) => {
  /*
   * This test exercises only listByChannel.
   *
   * The remaining repository operations are deliberately omitted from the
   * test double because their concrete signatures are irrelevant here.
   */
  const repository = {
    listByChannel,
  } as MessageRepository;

  return Layer.succeed(MessageRepositoryTag, repository);
};

describe('listChannelMessages', () => {
  it('uses the default page size', async () => {
    const listByChannel: MessageRepository['listByChannel'] = vi.fn(() =>
      Effect.succeed(emptyPage)
    );

    const repositoryLayer = makeRepositoryLayer(listByChannel);

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
    const listByChannel: MessageRepository['listByChannel'] = vi.fn(() =>
      Effect.succeed(emptyPage)
    );

    const repositoryLayer = makeRepositoryLayer(listByChannel);

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
    const listByChannel: MessageRepository['listByChannel'] = vi.fn(() =>
      Effect.succeed(emptyPage)
    );

    const repositoryLayer = makeRepositoryLayer(listByChannel);

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

    const listByChannel = vi.fn<MessageRepository['listByChannel']>(() =>
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
