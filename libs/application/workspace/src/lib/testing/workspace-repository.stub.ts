import { Effect, Layer } from 'effect';
import { vi } from 'vitest';
import {
  WorkspaceRepositoryTag,
  type WorkspaceRepository,
} from '../repository';

export const makeWorkspaceRepositoryStub = (
  overrides: Partial<WorkspaceRepository> = {}
): WorkspaceRepository => ({
  archive: () =>
    Effect.dieMessage('Unexpected WorkspaceRepository.archive call in test'),
  addMember: () =>
    Effect.dieMessage('Unexpected WorkspaceRepository.addMember call in test'),
  listAccessible: () =>
    Effect.dieMessage(
      'Unexpected WorkspaceRepository.listAccessible call in test'
    ),
  listActiveMembers: () =>
    Effect.dieMessage(
      'Unexpected WorkspaceRepository.listActiveMembers call in test'
    ),
  leave: () =>
    Effect.dieMessage('Unexpected WorkspaceRepository.leave call in test'),
  inviteMember: () =>
    Effect.dieMessage(
      'Unexpected WorkspaceRepository.inviteMember call in test'
    ),
  listPendingInvitations: () =>
    Effect.dieMessage(
      'Unexpected WorkspaceRepository.listPendingInvitations call in test'
    ),
  acceptInvitation: () =>
    Effect.dieMessage(
      'Unexpected WorkspaceRepository.acceptInvitation call in test'
    ),
  declineInvitation: () =>
    Effect.dieMessage(
      'Unexpected WorkspaceRepository.declineInvitation call in test'
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
  suspendMember: () =>
    Effect.dieMessage(
      'Unexpected WorkspaceRepository.suspendMember call in test'
    ),
  update: () =>
    Effect.dieMessage('Unexpected WorkspaceRepository.update call in test'),
  ...overrides,
});

export const makeWorkspaceRepositoryLayer = (
  overrides: Partial<WorkspaceRepository> = {}
): Layer.Layer<WorkspaceRepository> =>
  Layer.succeed(WorkspaceRepositoryTag, makeWorkspaceRepositoryStub(overrides));

export const makeAddWorkspaceMemberRepository = (
  implementation: WorkspaceRepository['addMember']
) => {
  const addMember = vi.fn(implementation);

  return {
    addMember,
    repositoryLayer: makeWorkspaceRepositoryLayer({ addMember }),
  };
};

export const makeArchiveWorkspaceRepository = (
  implementation: WorkspaceRepository['archive']
) => {
  const archive = vi.fn(implementation);

  return {
    archive,
    repositoryLayer: makeWorkspaceRepositoryLayer({ archive }),
  };
};

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

export const makeUpdateWorkspaceRepository = (
  implementation: WorkspaceRepository['update']
) => {
  const update = vi.fn(implementation);

  return {
    update,
    repositoryLayer: makeWorkspaceRepositoryLayer({ update }),
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

export const makeLeaveWorkspaceRepository = (
  implementation: WorkspaceRepository['leave']
) => {
  const leave = vi.fn(implementation);

  return {
    leave,
    repositoryLayer: makeWorkspaceRepositoryLayer({ leave }),
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

export const makeSuspendWorkspaceMemberRepository = (
  implementation: WorkspaceRepository['suspendMember']
) => {
  const suspendMember = vi.fn(implementation);

  return {
    suspendMember,
    repositoryLayer: makeWorkspaceRepositoryLayer({ suspendMember }),
  };
};

export const makeInviteWorkspaceMemberRepository = (
  implementation: WorkspaceRepository['inviteMember']
) => {
  const inviteMember = vi.fn(implementation);

  return {
    inviteMember,
    repositoryLayer: makeWorkspaceRepositoryLayer({ inviteMember }),
  };
};

export const makeListPendingWorkspaceInvitationsRepository = (
  implementation: WorkspaceRepository['listPendingInvitations']
) => {
  const listPendingInvitations = vi.fn(implementation);

  return {
    listPendingInvitations,
    repositoryLayer: makeWorkspaceRepositoryLayer({ listPendingInvitations }),
  };
};

export const makeAcceptWorkspaceInvitationRepository = (
  implementation: WorkspaceRepository['acceptInvitation']
) => {
  const acceptInvitation = vi.fn(implementation);

  return {
    acceptInvitation,
    repositoryLayer: makeWorkspaceRepositoryLayer({ acceptInvitation }),
  };
};

export const makeDeclineWorkspaceInvitationRepository = (
  implementation: WorkspaceRepository['declineInvitation']
) => {
  const declineInvitation = vi.fn(implementation);

  return {
    declineInvitation,
    repositoryLayer: makeWorkspaceRepositoryLayer({ declineInvitation }),
  };
};
