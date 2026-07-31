import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  ChannelCreationNotAllowedError,
  ChannelSlugUnavailableError,
} from '../repository';
import {
  channelId,
  makeCreateChannelRepository,
  workspaceId,
} from '../testing';
import { createChannel } from './create-channel';

describe('createChannel', () => {
  it('normalizes creation values before repository access', async () => {
    const { create, repositoryLayer } = makeCreateChannelRepository(() =>
      Effect.succeed(channelId)
    );

    const result = await Effect.runPromise(
      createChannel({
        workspaceId,
        name: '  Product Design  ',
        slug: '  Product-Design  ',
        description: '  Design collaboration  ',
      }).pipe(Effect.provide(repositoryLayer))
    );

    expect(create).toHaveBeenCalledExactlyOnceWith({
      workspaceId,
      name: 'Product Design',
      slug: 'product-design',
      description: 'Design collaboration',
    });
    expect(result).toEqual({
      id: channelId,
      workspaceId,
      name: 'Product Design',
      slug: 'product-design',
      description: 'Design collaboration',
    });
  });

  it.each([
    ['missing description', {}, null],
    ['null description', { description: null }, null],
    ['blank description', { description: '   ' }, null],
  ])('normalizes %s to absence', async (_label, optionalInput, description) => {
    const { create, repositoryLayer } = makeCreateChannelRepository(() =>
      Effect.succeed(channelId)
    );

    await Effect.runPromise(
      createChannel({
        workspaceId,
        name: 'General',
        slug: 'general',
        ...optionalInput,
      }).pipe(Effect.provide(repositoryLayer))
    );

    expect(create).toHaveBeenCalledExactlyOnceWith({
      workspaceId,
      name: 'General',
      slug: 'general',
      description,
    });
  });

  it.each([
    ['null input', null, 'workspaceId'],
    ['undefined input', undefined, 'workspaceId'],
    ['missing workspace', { name: 'General', slug: 'general' }, 'workspaceId'],
    [
      'invalid workspace',
      { workspaceId: 'not-a-uuid', name: 'General', slug: 'general' },
      'workspaceId',
    ],
    ['missing name', { workspaceId, slug: 'general' }, 'name'],
    ['blank name', { workspaceId, name: '   ', slug: 'general' }, 'name'],
    ['missing slug', { workspaceId, name: 'General' }, 'slug'],
    [
      'invalid slug',
      { workspaceId, name: 'General', slug: 'general--chat' },
      'slug',
    ],
    [
      'non-string description',
      { workspaceId, name: 'General', slug: 'general', description: 42 },
      'description',
    ],
  ])('rejects %s before repository access', async (_label, input, field) => {
    const { create, repositoryLayer } = makeCreateChannelRepository(() =>
      Effect.succeed(channelId)
    );

    const result = await Effect.runPromise(
      createChannel(input).pipe(Effect.provide(repositoryLayer), Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'InvalidChannelCreationInputError',
        field,
      });
    }
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    new ChannelSlugUnavailableError({ workspaceId, slug: 'general' }),
    new ChannelCreationNotAllowedError({ workspaceId }),
  ])('preserves the $._tag repository failure', async (failure) => {
    const { repositoryLayer } = makeCreateChannelRepository(() =>
      Effect.fail(failure)
    );

    const result = await Effect.runPromise(
      createChannel({
        workspaceId,
        name: 'General',
        slug: 'general',
      }).pipe(Effect.provide(repositoryLayer), Effect.either)
    );

    expect(result).toEqual(Either.left(failure));
  });
});
