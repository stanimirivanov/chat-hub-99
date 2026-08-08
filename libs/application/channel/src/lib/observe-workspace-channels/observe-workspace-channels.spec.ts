import { Effect, Either, Stream } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { ChannelRepositoryUnavailableError } from '../repository';
import { channel, makeChannelRepositoryLayer, workspaceId } from '../testing';
import {
  InvalidWorkspaceChannelObservationInputError,
  observeWorkspaceChannels,
} from './observe-workspace-channels';

describe('observeWorkspaceChannels', () => {
  it('resolves every scoped invalidation through the authoritative list', async () => {
    const changesByWorkspace = vi.fn(() => Stream.make(undefined, undefined));
    const listByWorkspace = vi.fn(() => Effect.succeed([channel]));

    const snapshots = await Effect.runPromise(
      observeWorkspaceChannels({ workspaceId }).pipe(
        Stream.runCollect,
        Effect.map((chunk) => Array.from(chunk)),
        Effect.provide(
          makeChannelRepositoryLayer({
            changesByWorkspace,
            listByWorkspace,
          })
        )
      )
    );

    expect(snapshots).toEqual([[channel], [channel]]);
    expect(changesByWorkspace).toHaveBeenCalledExactlyOnceWith(workspaceId);
    expect(listByWorkspace).toHaveBeenCalledTimes(2);
    expect(listByWorkspace).toHaveBeenNthCalledWith(1, workspaceId);
    expect(listByWorkspace).toHaveBeenNthCalledWith(2, workspaceId);
  });

  it('rejects invalid workspace identity before acquiring the repository', async () => {
    const changesByWorkspace = vi.fn(() => Stream.empty);

    const result = await Effect.runPromise(
      observeWorkspaceChannels({ workspaceId: 'not-a-workspace-id' }).pipe(
        Stream.runDrain,
        Effect.provide(makeChannelRepositoryLayer({ changesByWorkspace })),
        Effect.either
      )
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(
        InvalidWorkspaceChannelObservationInputError
      );
    }
    expect(changesByWorkspace).not.toHaveBeenCalled();
  });

  it('preserves repository observation failures', async () => {
    const failure = new ChannelRepositoryUnavailableError({
      cause: new Error('Realtime unavailable'),
    });

    const result = await Effect.runPromise(
      observeWorkspaceChannels({ workspaceId }).pipe(
        Stream.runDrain,
        Effect.provide(
          makeChannelRepositoryLayer({
            changesByWorkspace: () => Stream.fail(failure),
          })
        ),
        Effect.either
      )
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBe(failure);
    }
  });
});
