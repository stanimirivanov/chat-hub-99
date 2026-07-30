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
  ...overrides,
});

export const makeListByWorkspaceChannelRepository = (
  implementation: ChannelRepository['listByWorkspace']
) => {
  const listByWorkspace = vi.fn(implementation);
  const repository = makeChannelRepositoryStub({ listByWorkspace });

  return {
    listByWorkspace,
    repositoryLayer: Layer.succeed(ChannelRepositoryTag, repository),
  };
};
