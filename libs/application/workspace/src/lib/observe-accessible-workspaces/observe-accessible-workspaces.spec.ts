import { Chunk, Effect, Either, Stream } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceRepositoryUnavailableError } from '../repository';
import { makeWorkspaceRepositoryLayer, workspace } from '../testing';
import { observeAccessibleWorkspaces } from './observe-accessible-workspaces';

describe('observeAccessibleWorkspaces', () => {
  it('loads an authoritative snapshot for every access invalidation', async () => {
    const accessChanges = vi.fn(() => Stream.make(undefined, undefined));
    const listAccessible = vi.fn(() => Effect.succeed([workspace]));

    const snapshots = await Effect.runPromise(
      observeAccessibleWorkspaces.pipe(
        Stream.provideLayer(
          makeWorkspaceRepositoryLayer({ accessChanges, listAccessible })
        ),
        Stream.runCollect
      )
    );

    expect(Chunk.toReadonlyArray(snapshots)).toEqual([
      [workspace],
      [workspace],
    ]);
    expect(accessChanges).toHaveBeenCalledOnce();
    expect(listAccessible).toHaveBeenCalledTimes(2);
  });

  it('preserves observation failures without querying a snapshot', async () => {
    const failure = new WorkspaceRepositoryUnavailableError({
      cause: new Error('Realtime unavailable'),
    });
    const listAccessible = vi.fn(() => Effect.succeed([workspace]));

    const result = await Effect.runPromise(
      observeAccessibleWorkspaces.pipe(
        Stream.provideLayer(
          makeWorkspaceRepositoryLayer({
            accessChanges: () => Stream.fail(failure),
            listAccessible,
          })
        ),
        Stream.runCollect,
        Effect.either
      )
    );

    expect(result).toEqual(Either.left(failure));
    expect(listAccessible).not.toHaveBeenCalled();
  });

  it('preserves failures from the authoritative refresh', async () => {
    const failure = new WorkspaceRepositoryUnavailableError({
      cause: new Error('Workspace query unavailable'),
    });

    const result = await Effect.runPromise(
      observeAccessibleWorkspaces.pipe(
        Stream.provideLayer(
          makeWorkspaceRepositoryLayer({
            accessChanges: () => Stream.make(undefined),
            listAccessible: () => Effect.fail(failure),
          })
        ),
        Stream.runCollect,
        Effect.either
      )
    );

    expect(result).toEqual(Either.left(failure));
  });
});
