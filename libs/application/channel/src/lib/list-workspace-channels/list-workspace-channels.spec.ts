import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import type { Channel } from '@omoikane/domain/channel';
import { ChannelRepositoryUnavailableError } from '../repository';
import { makeListByWorkspaceChannelRepository, workspaceId } from '../testing';
import { listWorkspaceChannels } from './list-workspace-channels';

describe('listWorkspaceChannels', () => {
  it('delegates workspace-scoped discovery to the repository', async () => {
    const channels: readonly Channel[] = [];
    const { listByWorkspace, repositoryLayer } =
      makeListByWorkspaceChannelRepository(() => Effect.succeed(channels));

    const result = await Effect.runPromise(
      listWorkspaceChannels(workspaceId).pipe(Effect.provide(repositoryLayer))
    );

    expect(result).toBe(channels);
    expect(listByWorkspace).toHaveBeenCalledExactlyOnceWith(workspaceId);
  });

  it('preserves the repository failure channel', async () => {
    const failure = new ChannelRepositoryUnavailableError({
      cause: new Error('Provider unavailable'),
    });
    const { repositoryLayer } = makeListByWorkspaceChannelRepository(() =>
      Effect.fail(failure)
    );

    const result = await Effect.runPromise(
      listWorkspaceChannels(workspaceId).pipe(
        Effect.provide(repositoryLayer),
        Effect.either
      )
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBe(failure);
    }
  });
});
