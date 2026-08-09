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
  searchWorkspace: () => unexpectedOperation('searchWorkspace'),
  listUnreadByWorkspace: () => unexpectedOperation('listUnreadByWorkspace'),
  markRead: () => unexpectedOperation('markRead'),
  listRevisions: () => unexpectedOperation('listRevisions'),
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

export const makeListRevisionsRepository = (
  implementation: MessageRepository['listRevisions']
) => {
  const listRevisions = vi.fn(implementation);

  return {
    listRevisions,
    repositoryLayer: makeMessageRepositoryLayer({ listRevisions }),
  };
};

export const makeSearchWorkspaceRepository = (
  implementation: MessageRepository['searchWorkspace']
) => {
  const searchWorkspace = vi.fn(implementation);

  return {
    searchWorkspace,
    repositoryLayer: makeMessageRepositoryLayer({ searchWorkspace }),
  };
};

export const makeUnreadRepository = (
  overrides: Pick<
    Partial<MessageRepository>,
    'listUnreadByWorkspace' | 'markRead'
  >
) => {
  const listUnreadByWorkspace = vi.fn(
    overrides.listUnreadByWorkspace ??
      (() => unexpectedOperation('listUnreadByWorkspace'))
  );
  const markRead = vi.fn(
    overrides.markRead ?? (() => unexpectedOperation('markRead'))
  );

  return {
    listUnreadByWorkspace,
    markRead,
    repositoryLayer: makeMessageRepositoryLayer({
      listUnreadByWorkspace,
      markRead,
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
