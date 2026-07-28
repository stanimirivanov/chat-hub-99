import { Effect, Layer } from 'effect';
import { vi } from 'vitest';

import type { MessageRepository } from '../repository/message-repository';
import { MessageRepositoryTag } from '../repository/message-repository';

const unexpectedOperation = (
  operation: keyof MessageRepository
): Effect.Effect<never> =>
  Effect.die(
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
