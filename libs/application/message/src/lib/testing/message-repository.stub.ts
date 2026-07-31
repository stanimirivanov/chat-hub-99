import { Effect, Layer, Stream } from 'effect';
import { vi } from 'vitest';

import { MessageRepositoryTag, type MessageRepository } from '../repository';

const unexpectedOperation = (
  operation: keyof MessageRepository
): Effect.Effect<never> =>
  Effect.die(
    new Error(`Unexpected MessageRepository.${operation} call in test`)
  );

const unexpectedStream = (operation: keyof MessageRepository) =>
  Stream.die(
    new Error(`Unexpected MessageRepository.${operation} call in test`)
  );

export const makeMessageRepositoryStub = (
  overrides: Partial<MessageRepository> = {}
): MessageRepository => ({
  create: () => unexpectedOperation('create'),
  edit: () => unexpectedOperation('edit'),
  delete: () => unexpectedOperation('delete'),
  findById: () => unexpectedOperation('findById'),
  listByChannel: () => unexpectedOperation('listByChannel'),
  changesByChannel: () => unexpectedStream('changesByChannel'),
  ...overrides,
});

export const makeMessageRepositoryLayer = (
  overrides: Partial<MessageRepository> = {}
): Layer.Layer<MessageRepository> =>
  Layer.succeed(MessageRepositoryTag, makeMessageRepositoryStub(overrides));

export const makeListByChannelRepository = (
  implementation: MessageRepository['listByChannel']
) => {
  const listByChannel = vi.fn(implementation);

  return {
    listByChannel,
    repositoryLayer: makeMessageRepositoryLayer({
      listByChannel,
    }),
  };
};

export const makeObserveByChannelRepository = (
  changesByChannel: MessageRepository['changesByChannel'],
  findById: MessageRepository['findById']
) => ({
  changesByChannel: vi.fn(changesByChannel),
  findById: vi.fn(findById),
});
