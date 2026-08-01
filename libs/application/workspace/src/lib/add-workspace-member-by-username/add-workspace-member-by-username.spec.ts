import { Effect, Either, Layer, Schema } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import {
  ProfileRepositoryTag,
  ProfileRepositoryUnavailableError,
  type ProfileRepository,
} from '@chat-hub/application/profile';
import { ProfileIdSchema, type Profile } from '@chat-hub/domain/profile';
import type { WorkspaceMember } from '@chat-hub/domain/workspace';
import {
  WorkspaceMembershipHistoryExistsError,
  type AddWorkspaceMemberCommand,
} from '../repository';
import { makeAddWorkspaceMemberRepository, workspace } from '../testing';
import { addWorkspaceMemberByUsername } from './add-workspace-member-by-username';

const candidateProfile: Profile = {
  id: Schema.decodeUnknownSync(ProfileIdSchema)(
    '00000000-0000-4000-8000-000000000020'
  ),
  username: 'Candidate',
  displayName: 'Candidate Member',
  avatarUrl: null,
  status: 'active',
};

const addedMember: WorkspaceMember = {
  workspaceId: workspace.id,
  profileId: candidateProfile.id,
  role: 'member',
};

const makeProfileLookupRepository = (
  implementation: ProfileRepository['findActiveByUsername']
) => {
  const findActiveByUsername = vi.fn(implementation);
  const repository: ProfileRepository = {
    findActiveByUsername,
    findCurrentById: () => Effect.dieMessage('Unexpected findCurrentById call'),
    updateCurrent: () => Effect.dieMessage('Unexpected updateCurrent call'),
    listCurrentByIds: () =>
      Effect.dieMessage('Unexpected listCurrentByIds call'),
  };

  return {
    findActiveByUsername,
    repositoryLayer: Layer.succeed(ProfileRepositoryTag, repository),
  };
};

describe('addWorkspaceMemberByUsername', () => {
  it('resolves the normalized username and adds the profile as a member', async () => {
    const profileStub = makeProfileLookupRepository(() =>
      Effect.succeed(candidateProfile)
    );
    const workspaceStub = makeAddWorkspaceMemberRepository(() =>
      Effect.succeed(addedMember)
    );
    const layer = Layer.merge(
      profileStub.repositoryLayer,
      workspaceStub.repositoryLayer
    );

    const result = await Effect.runPromise(
      addWorkspaceMemberByUsername({
        workspaceId: `  ${workspace.id}  `,
        username: '  Candidate  ',
      }).pipe(Effect.provide(layer))
    );

    expect(profileStub.findActiveByUsername).toHaveBeenCalledExactlyOnceWith(
      'Candidate'
    );
    expect(workspaceStub.addMember).toHaveBeenCalledExactlyOnceWith({
      workspaceId: workspace.id,
      profileId: candidateProfile.id,
    } satisfies AddWorkspaceMemberCommand);
    expect(result).toEqual({ member: addedMember, profile: candidateProfile });
  });

  it.each([
    ['null input', null, 'workspaceId'],
    ['undefined input', undefined, 'workspaceId'],
    [
      'invalid workspace identity',
      { workspaceId: 'not-a-workspace-id', username: 'candidate' },
      'workspaceId',
    ],
    ['missing username', { workspaceId: workspace.id }, 'username'],
    [
      'blank username',
      { workspaceId: workspace.id, username: '   ' },
      'username',
    ],
    [
      'non-string username',
      { workspaceId: workspace.id, username: 42 },
      'username',
    ],
  ])('rejects %s before repository access', async (_label, input, field) => {
    const profileStub = makeProfileLookupRepository(() =>
      Effect.succeed(candidateProfile)
    );
    const workspaceStub = makeAddWorkspaceMemberRepository(() =>
      Effect.succeed(addedMember)
    );
    const layer = Layer.merge(
      profileStub.repositoryLayer,
      workspaceStub.repositoryLayer
    );

    const result = await Effect.runPromise(
      addWorkspaceMemberByUsername(input).pipe(
        Effect.provide(layer),
        Effect.either
      )
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'InvalidWorkspaceMemberAdditionInputError',
        field,
      });
    }
    expect(profileStub.findActiveByUsername).not.toHaveBeenCalled();
    expect(workspaceStub.addMember).not.toHaveBeenCalled();
  });

  it('fails explicitly when the username has no active profile', async () => {
    const profileStub = makeProfileLookupRepository(() => Effect.succeed(null));
    const workspaceStub = makeAddWorkspaceMemberRepository(() =>
      Effect.succeed(addedMember)
    );
    const layer = Layer.merge(
      profileStub.repositoryLayer,
      workspaceStub.repositoryLayer
    );

    const result = await Effect.runPromise(
      addWorkspaceMemberByUsername({
        workspaceId: workspace.id,
        username: 'missing',
      }).pipe(Effect.provide(layer), Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'WorkspaceMemberCandidateNotFoundError',
        username: 'missing',
      });
    }
    expect(workspaceStub.addMember).not.toHaveBeenCalled();
  });

  it('preserves profile lookup failures', async () => {
    const failure = new ProfileRepositoryUnavailableError({
      cause: new Error('Profiles unavailable'),
    });
    const profileStub = makeProfileLookupRepository(() => Effect.fail(failure));
    const workspaceStub = makeAddWorkspaceMemberRepository(() =>
      Effect.succeed(addedMember)
    );
    const layer = Layer.merge(
      profileStub.repositoryLayer,
      workspaceStub.repositoryLayer
    );

    const result = await Effect.runPromise(
      addWorkspaceMemberByUsername({
        workspaceId: workspace.id,
        username: 'candidate',
      }).pipe(Effect.provide(layer), Effect.either)
    );

    expect(result).toEqual(Either.left(failure));
    expect(workspaceStub.addMember).not.toHaveBeenCalled();
  });

  it('preserves an existing membership-history failure', async () => {
    const failure = new WorkspaceMembershipHistoryExistsError({
      workspaceId: workspace.id,
      profileId: candidateProfile.id,
    });
    const profileStub = makeProfileLookupRepository(() =>
      Effect.succeed(candidateProfile)
    );
    const workspaceStub = makeAddWorkspaceMemberRepository(() =>
      Effect.fail(failure)
    );
    const layer = Layer.merge(
      profileStub.repositoryLayer,
      workspaceStub.repositoryLayer
    );

    const result = await Effect.runPromise(
      addWorkspaceMemberByUsername({
        workspaceId: workspace.id,
        username: 'candidate',
      }).pipe(Effect.provide(layer), Effect.either)
    );

    expect(result).toEqual(Either.left(failure));
  });
});
