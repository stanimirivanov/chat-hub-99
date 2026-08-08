import { Effect, Layer, Stream } from 'effect';
import { vi } from 'vitest';
import { ChannelRepositoryTag, type ChannelRepository } from '../repository';

export const makeChannelRepositoryStub = (
  overrides: Partial<ChannelRepository> = {}
): ChannelRepository => ({
  changesByWorkspace: () =>
    Stream.die(
      new Error('Unexpected ChannelRepository.changesByWorkspace call in test')
    ),
  archive: () =>
    Effect.dieMessage('Unexpected ChannelRepository.archive call in test'),
  listByWorkspace: () =>
    Effect.dieMessage(
      'Unexpected ChannelRepository.listByWorkspace call in test'
    ),
  listArchivedByWorkspace: () =>
    Effect.dieMessage(
      'Unexpected ChannelRepository.listArchivedByWorkspace call in test'
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

export const makeListArchivedByWorkspaceChannelRepository = (
  implementation: ChannelRepository['listArchivedByWorkspace']
) => {
  const listArchivedByWorkspace = vi.fn(implementation);

  return {
    listArchivedByWorkspace,
    repositoryLayer: makeChannelRepositoryLayer({ listArchivedByWorkspace }),
  };
};

export const makeChangesByWorkspaceChannelRepository = (
  implementation: ChannelRepository['changesByWorkspace']
) => {
  const changesByWorkspace = vi.fn(implementation);

  return {
    changesByWorkspace,
    repositoryLayer: makeChannelRepositoryLayer({ changesByWorkspace }),
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

export const makeArchiveChannelRepository = (
  implementation: ChannelRepository['archive']
) => {
  const archive = vi.fn(implementation);

  return {
    archive,
    repositoryLayer: makeChannelRepositoryLayer({ archive }),
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
