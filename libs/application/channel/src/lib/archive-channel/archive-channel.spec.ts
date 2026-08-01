import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  ChannelArchiveNotAllowedError,
  ChannelRepositoryUnavailableError,
} from '../repository';
import { channelId, makeArchiveChannelRepository } from '../testing';
import { archiveChannel } from './archive-channel';

describe('archiveChannel', () => {
  it('normalizes the channel identity before repository access', async () => {
    const { archive, repositoryLayer } = makeArchiveChannelRepository(() =>
      Effect.succeed(undefined)
    );

    const result = await Effect.runPromise(
      archiveChannel({ channelId: `  ${channelId}  ` }).pipe(
        Effect.provide(repositoryLayer)
      )
    );

    expect(result).toBeUndefined();
    expect(archive).toHaveBeenCalledExactlyOnceWith(channelId);
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
    const { archive, repositoryLayer } = makeArchiveChannelRepository(() =>
      Effect.succeed(undefined)
    );

    const result = await Effect.runPromise(
      archiveChannel(input).pipe(Effect.provide(repositoryLayer), Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidChannelArchiveInputError');
    }
    expect(archive).not.toHaveBeenCalled();
  });

  it.each([
    new ChannelArchiveNotAllowedError({ channelId }),
    new ChannelRepositoryUnavailableError({
      cause: new Error('Provider unavailable'),
    }),
  ])('preserves the $._tag repository failure', async (failure) => {
    const { repositoryLayer } = makeArchiveChannelRepository(() =>
      Effect.fail(failure)
    );

    const result = await Effect.runPromise(
      archiveChannel({ channelId }).pipe(
        Effect.provide(repositoryLayer),
        Effect.either
      )
    );

    expect(result).toEqual(Either.left(failure));
  });
});
