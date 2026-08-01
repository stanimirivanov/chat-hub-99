import { Effect, Layer } from 'effect';
import { vi } from 'vitest';
import { ProfileRepositoryTag, type ProfileRepository } from '../repository';

export const makeProfileRepositoryStub = (
  overrides: Partial<ProfileRepository> = {}
): ProfileRepository => ({
  findActiveByUsername: () =>
    Effect.dieMessage(
      'Unexpected ProfileRepository.findActiveByUsername call in test'
    ),
  findCurrentById: () =>
    Effect.dieMessage(
      'Unexpected ProfileRepository.findCurrentById call in test'
    ),
  updateCurrent: () =>
    Effect.dieMessage(
      'Unexpected ProfileRepository.updateCurrent call in test'
    ),
  listCurrentByIds: () =>
    Effect.dieMessage(
      'Unexpected ProfileRepository.listCurrentByIds call in test'
    ),
  ...overrides,
});

export const makeFindActiveProfileByUsernameRepository = (
  implementation: ProfileRepository['findActiveByUsername']
) => {
  const findActiveByUsername = vi.fn(implementation);
  const repository = makeProfileRepositoryStub({ findActiveByUsername });

  return {
    findActiveByUsername,
    repositoryLayer: Layer.succeed(ProfileRepositoryTag, repository),
  };
};

export const makeFindCurrentProfileRepository = (
  implementation: ProfileRepository['findCurrentById']
) => {
  const findCurrentById = vi.fn(implementation);
  const repository = makeProfileRepositoryStub({ findCurrentById });

  return {
    findCurrentById,
    repositoryLayer: Layer.succeed(ProfileRepositoryTag, repository),
  };
};

export const makeUpdateCurrentProfileRepository = (
  implementation: ProfileRepository['updateCurrent']
) => {
  const updateCurrent = vi.fn(implementation);
  const repository = makeProfileRepositoryStub({ updateCurrent });

  return {
    updateCurrent,
    repositoryLayer: Layer.succeed(ProfileRepositoryTag, repository),
  };
};

export const makeListCurrentProfilesRepository = (
  implementation: ProfileRepository['listCurrentByIds']
) => {
  const listCurrentByIds = vi.fn(implementation);
  const repository = makeProfileRepositoryStub({ listCurrentByIds });

  return {
    listCurrentByIds,
    repositoryLayer: Layer.succeed(ProfileRepositoryTag, repository),
  };
};
