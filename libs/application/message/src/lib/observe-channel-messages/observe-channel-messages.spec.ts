import { Chunk, Effect, Either, Stream } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  MessageRepositoryUnavailableError,
  type MessageChangeNotification,
} from '../repository';
import {
  activeMessage,
  channelId,
  makeMessageRepositoryLayer,
  makeObserveByChannelRepository,
  messageId,
} from '../testing';
import { observeChannelMessages } from './observe-channel-messages';

const notification: MessageChangeNotification = {
  kind: 'created',
  messageId,
};

describe('observeChannelMessages', () => {
  it('loads the authoritative projection for each repository notification', async () => {
    const repository = makeObserveByChannelRepository(
      () => Stream.make(notification),
      () => Effect.succeed(activeMessage)
    );

    const changes = await Effect.runPromise(
      observeChannelMessages({ channelId }).pipe(
        Stream.provideLayer(makeMessageRepositoryLayer(repository)),
        Stream.runCollect
      )
    );

    expect(Chunk.toReadonlyArray(changes)).toEqual([
      {
        kind: 'created',
        message: activeMessage,
      },
    ]);
    expect(repository.changesByChannel).toHaveBeenCalledExactlyOnceWith(
      channelId
    );
    expect(repository.findById).toHaveBeenCalledExactlyOnceWith(messageId);
  });

  it.each([
    ['null input', null],
    ['undefined input', undefined],
    ['missing channel identity', {}],
    ['null channel identity', { channelId: null }],
    ['invalid channel identity', { channelId: '' }],
  ])(
    'rejects %s before starting repository observation',
    async (_label, input) => {
      const repository = makeObserveByChannelRepository(
        () => Stream.make(notification),
        () => Effect.succeed(activeMessage)
      );

      const result = await Effect.runPromise(
        observeChannelMessages(input).pipe(
          Stream.provideLayer(makeMessageRepositoryLayer(repository)),
          Stream.runCollect,
          Effect.either
        )
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left._tag).toBe(
          'InvalidChannelMessageObservationInputError'
        );
      }
      expect(repository.changesByChannel).not.toHaveBeenCalled();
      expect(repository.findById).not.toHaveBeenCalled();
    }
  );

  it('preserves repository stream failures', async () => {
    const repositoryError = new MessageRepositoryUnavailableError({
      operation: 'read',
      cause: new Error('Realtime unavailable'),
    });
    const repository = makeObserveByChannelRepository(
      () => Stream.fail(repositoryError),
      () => Effect.succeed(activeMessage)
    );

    const result = await Effect.runPromise(
      observeChannelMessages({ channelId }).pipe(
        Stream.provideLayer(makeMessageRepositoryLayer(repository)),
        Stream.runCollect,
        Effect.either
      )
    );

    expect(result).toEqual(Either.left(repositoryError));
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('preserves failures while loading the changed projection', async () => {
    const repositoryError = new MessageRepositoryUnavailableError({
      operation: 'read',
      cause: new Error('Projection unavailable'),
    });
    const repository = makeObserveByChannelRepository(
      () => Stream.make(notification),
      () => Effect.fail(repositoryError)
    );

    const result = await Effect.runPromise(
      observeChannelMessages({ channelId }).pipe(
        Stream.provideLayer(makeMessageRepositoryLayer(repository)),
        Stream.runCollect,
        Effect.either
      )
    );

    expect(result).toEqual(Either.left(repositoryError));
  });
});
