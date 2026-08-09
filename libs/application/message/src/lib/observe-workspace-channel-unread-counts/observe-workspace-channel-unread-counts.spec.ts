import { Chunk, Effect, Either, Stream } from 'effect';
import { describe, expect, it } from 'vitest';
import { MessageRepositoryUnavailableError } from '../repository';
import { channelId, makeUnreadRepository } from '../testing';
import { observeWorkspaceChannelUnreadCounts } from './observe-workspace-channel-unread-counts';

const workspaceId = '00000000-0000-4000-8000-000000000010';

describe('observeWorkspaceChannelUnreadCounts', () => {
  it('reloads the authoritative snapshot for every invalidation', async () => {
    const counts = [{ channelId, unreadCount: 2 }] as const;
    const repository = makeUnreadRepository({
      unreadChangesByWorkspace: () => Stream.make(undefined, undefined),
      listUnreadByWorkspace: () => Effect.succeed(counts),
    });

    const snapshots = await Effect.runPromise(
      observeWorkspaceChannelUnreadCounts({ workspaceId }).pipe(
        Stream.provideLayer(repository.repositoryLayer),
        Stream.runCollect
      )
    );

    expect(Chunk.toReadonlyArray(snapshots)).toEqual([counts, counts]);
    expect(repository.unreadChangesByWorkspace).toHaveBeenCalledExactlyOnceWith(
      workspaceId
    );
    expect(repository.listUnreadByWorkspace).toHaveBeenCalledTimes(2);
  });

  it.each([null, undefined, {}, { workspaceId: null }, { workspaceId: '' }])(
    'rejects invalid input %j before subscribing',
    async (input) => {
      const repository = makeUnreadRepository({});
      const result = await Effect.runPromise(
        observeWorkspaceChannelUnreadCounts(input).pipe(
          Stream.provideLayer(repository.repositoryLayer),
          Stream.runCollect,
          Effect.either
        )
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left._tag).toBe(
          'InvalidWorkspaceUnreadObservationInputError'
        );
      }
      expect(repository.unreadChangesByWorkspace).not.toHaveBeenCalled();
    }
  );

  it('preserves repository stream failures', async () => {
    const failure = new MessageRepositoryUnavailableError({
      operation: 'read',
      cause: new Error('Realtime unavailable'),
    });
    const repository = makeUnreadRepository({
      unreadChangesByWorkspace: () => Stream.fail(failure),
    });

    const result = await Effect.runPromise(
      observeWorkspaceChannelUnreadCounts({ workspaceId }).pipe(
        Stream.provideLayer(repository.repositoryLayer),
        Stream.runCollect,
        Effect.either
      )
    );

    expect(result).toEqual(Either.left(failure));
    expect(repository.listUnreadByWorkspace).not.toHaveBeenCalled();
  });
});
