import { Effect, Layer } from 'effect';
import { vi } from 'vitest';
import { ChannelRepositoryTag, type ChannelRepository } from '../repository';

export const makeChannelRepositoryStub = (
  overrides: Partial<ChannelRepository> = {}
): ChannelRepository => ({
  listByWorkspace: () =>
    Effect.dieMessage(
      'Unexpected ChannelRepository.listByWorkspace call in test'
    ),
  create: () =>
    Effect.dieMessage('Unexpected ChannelRepository.create call in test'),
  update: () =>
    Effect.dieMessage('Unexpected ChannelRepository.update call in test'),
  ...overrides,
});

export const makeChannelRepositoryLayer = (
  overrides: Partial<ChannelRepository> = {}
): Layer.Layer<ChannelRepository> =>
  Layer.succeed(ChannelRepositoryTag, makeChannelRepositoryStub(overrides));

export const makeListByWorkspaceChannelRepository = (
  implementation: ChannelRepository['listByWorkspace']
) => {
  const listByWorkspace = vi.fn(implementation);

  return {
    listByWorkspace,
    repositoryLayer: makeChannelRepositoryLayer({ listByWorkspace }),
  };
};

export const makeCreateChannelRepository = (
  implementation: ChannelRepository['create']
) => {
  const create = vi.fn(implementation);

  return {
    create,
    repositoryLayer: makeChannelRepositoryLayer({ create }),
  };
};

export const makeUpdateChannelRepository = (
  implementation: ChannelRepository['update']
) => {
  const update = vi.fn(implementation);

  return {
    update,
    repositoryLayer: makeChannelRepositoryLayer({ update }),
  };
};
