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
  listActiveMembers: () =>
    Effect.dieMessage(
      'Unexpected WorkspaceRepository.listActiveMembers call in test'
    ),
  create: () =>
    Effect.dieMessage('Unexpected WorkspaceRepository.create call in test'),
  changeMemberRole: () =>
    Effect.dieMessage(
      'Unexpected WorkspaceRepository.changeMemberRole call in test'
    ),
  removeMember: () =>
    Effect.dieMessage(
      'Unexpected WorkspaceRepository.removeMember call in test'
    ),
  ...overrides,
});

export const makeWorkspaceRepositoryLayer = (
  overrides: Partial<WorkspaceRepository> = {}
): Layer.Layer<WorkspaceRepository> =>
  Layer.succeed(WorkspaceRepositoryTag, makeWorkspaceRepositoryStub(overrides));

export const makeListAccessibleWorkspaceRepository = (
  implementation: WorkspaceRepository['listAccessible']
) => {
  const listAccessible = vi.fn(implementation);

  return {
    listAccessible,
    repositoryLayer: makeWorkspaceRepositoryLayer({ listAccessible }),
  };
};

export const makeCreateWorkspaceRepository = (
  implementation: WorkspaceRepository['create']
) => {
  const create = vi.fn(implementation);

  return {
    create,
    repositoryLayer: makeWorkspaceRepositoryLayer({ create }),
  };
};

export const makeListWorkspaceMembersRepository = (
  implementation: WorkspaceRepository['listActiveMembers']
) => {
  const listActiveMembers = vi.fn(implementation);

  return {
    listActiveMembers,
    repositoryLayer: makeWorkspaceRepositoryLayer({ listActiveMembers }),
  };
};

export const makeChangeWorkspaceMemberRoleRepository = (
  implementation: WorkspaceRepository['changeMemberRole']
) => {
  const changeMemberRole = vi.fn(implementation);

  return {
    changeMemberRole,
    repositoryLayer: makeWorkspaceRepositoryLayer({ changeMemberRole }),
  };
};

export const makeRemoveWorkspaceMemberRepository = (
  implementation: WorkspaceRepository['removeMember']
) => {
  const removeMember = vi.fn(implementation);

  return {
    removeMember,
    repositoryLayer: makeWorkspaceRepositoryLayer({ removeMember }),
  };
};
