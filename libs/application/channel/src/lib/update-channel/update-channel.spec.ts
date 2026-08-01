import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  ChannelRepositoryUnavailableError,
  ChannelUpdateNotAllowedError,
  InvalidChannelDataError,
} from '../repository';
import { channelId, makeUpdateChannelRepository } from '../testing';
import { updateChannel } from './update-channel';

describe('updateChannel', () => {
  it('normalizes mutable details before repository access', async () => {
    const { update, repositoryLayer } = makeUpdateChannelRepository(() =>
      Effect.succeed(undefined)
    );

    const result = await Effect.runPromise(
      updateChannel({
        channelId: `  ${channelId}  `,
        name: '  Product Design  ',
        description: '  Design collaboration  ',
      }).pipe(Effect.provide(repositoryLayer))
    );

    expect(update).toHaveBeenCalledExactlyOnceWith({
      channelId,
      name: 'Product Design',
      description: 'Design collaboration',
    });
    expect(result).toEqual({
      channelId,
      name: 'Product Design',
      description: 'Design collaboration',
    });
  });

  it.each([
    ['missing description', {}, null],
    ['null description', { description: null }, null],
    ['blank description', { description: '   ' }, null],
  ])('normalizes %s to absence', async (_label, optionalInput, description) => {
    const { update, repositoryLayer } = makeUpdateChannelRepository(() =>
      Effect.succeed(undefined)
    );

    await Effect.runPromise(
      updateChannel({
        channelId,
        name: 'General',
        ...optionalInput,
      }).pipe(Effect.provide(repositoryLayer))
    );

    expect(update).toHaveBeenCalledExactlyOnceWith({
      channelId,
      name: 'General',
      description,
    });
  });

  it.each([
    ['null input', null, 'channelId'],
    ['undefined input', undefined, 'channelId'],
    ['missing channel identity', { name: 'General' }, 'channelId'],
    [
      'null channel identity',
      { channelId: null, name: 'General' },
      'channelId',
    ],
    ['empty channel identity', { channelId: '', name: 'General' }, 'channelId'],
    [
      'blank channel identity',
      { channelId: '   ', name: 'General' },
      'channelId',
    ],
    [
      'invalid channel identity',
      { channelId: 'not-a-uuid', name: 'General' },
      'channelId',
    ],
    ['missing name', { channelId }, 'name'],
    ['null name', { channelId, name: null }, 'name'],
    ['blank name', { channelId, name: '   ' }, 'name'],
    [
      'non-string description',
      { channelId, name: 'General', description: 42 },
      'description',
    ],
  ])('rejects %s before repository access', async (_label, input, field) => {
    const { update, repositoryLayer } = makeUpdateChannelRepository(() =>
      Effect.succeed(undefined)
    );

    const result = await Effect.runPromise(
      updateChannel(input).pipe(Effect.provide(repositoryLayer), Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'InvalidChannelUpdateInputError',
        field,
      });
    }
    expect(update).not.toHaveBeenCalled();
  });

  it.each([
    new ChannelUpdateNotAllowedError({ channelId }),
    new ChannelRepositoryUnavailableError({
      cause: new Error('Provider unavailable'),
    }),
    new InvalidChannelDataError({ cause: 'Invalid version identity' }),
  ])('preserves the $._tag repository failure', async (failure) => {
    const { repositoryLayer } = makeUpdateChannelRepository(() =>
      Effect.fail(failure)
    );

    const result = await Effect.runPromise(
      updateChannel({ channelId, name: 'General' }).pipe(
        Effect.provide(repositoryLayer),
        Effect.either
      )
    );

    expect(result).toEqual(Either.left(failure));
  });
});
