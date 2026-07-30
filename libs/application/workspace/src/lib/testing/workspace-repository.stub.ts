import { Effect, Layer } from 'effect';
import { vi } from 'vitest';
import {
  WorkspaceRepositoryTag,
  type WorkspaceRepository,
} from '../repository';

export const makeWorkspaceRepositoryStub = (
  overrides: Partial<WorkspaceRepository> = {}
): WorkspaceRepository => ({
  listAccessible: () =>
    Effect.dieMessage(
      'Unexpected WorkspaceRepository.listAccessible call in test'
    ),
  ...overrides,
});

export const makeListAccessibleWorkspaceRepository = (
  implementation: WorkspaceRepository['listAccessible']
) => {
  const listAccessible = vi.fn(implementation);
  const repository = makeWorkspaceRepositoryStub({ listAccessible });

  return {
    listAccessible,
    repositoryLayer: Layer.succeed(WorkspaceRepositoryTag, repository),
  };
};
