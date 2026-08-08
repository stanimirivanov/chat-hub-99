import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  ChannelRepositoryUnavailableError,
  ChannelRestoreNotAllowedError,
} from '../repository';
import { channel, channelId, makeRestoreChannelRepository } from '../testing';
import { restoreChannel } from './restore-channel';

describe('restoreChannel', () => {
  it('normalizes the identity and returns the restored active channel', async () => {
    const { restore, repositoryLayer } = makeRestoreChannelRepository(() =>
      Effect.succeed(channel)
    );

    const result = await Effect.runPromise(
      restoreChannel({ channelId: `  ${channelId}  ` }).pipe(
        Effect.provide(repositoryLayer)
      )
    );

    expect(result).toEqual(channel);
    expect(restore).toHaveBeenCalledExactlyOnceWith(channelId);
  });

  it.each([
    ['null input', null],
    ['undefined input', undefined],
    ['missing channel identity', {}],
    ['null channel identity', { channelId: null }],
    ['empty channel identity', { channelId: '' }],
    ['blank channel identity', { channelId: '   ' }],
    ['non-string channel identity', { channelId: 42 }],
    ['invalid channel identity', { channelId: 'not-a-channel' }],
  ])('rejects %s before repository access', async (_label, input) => {
    const { restore, repositoryLayer } = makeRestoreChannelRepository(() =>
      Effect.succeed(channel)
    );

    const result = await Effect.runPromise(
      restoreChannel(input).pipe(Effect.provide(repositoryLayer), Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidChannelRestoreInputError');
    }
    expect(restore).not.toHaveBeenCalled();
  });

  it.each([
    new ChannelRestoreNotAllowedError({ channelId }),
    new ChannelRepositoryUnavailableError({ cause: 'offline' }),
  ])('preserves the $._tag repository failure', async (failure) => {
    const { repositoryLayer } = makeRestoreChannelRepository(() =>
      Effect.fail(failure)
    );

    const result = await Effect.runPromise(
      restoreChannel({ channelId }).pipe(
        Effect.provide(repositoryLayer),
        Effect.either
      )
    );

    expect(result).toEqual(Either.left(failure));
  });
});
