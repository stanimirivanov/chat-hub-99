import { Effect, Either, Layer, Schema } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import {
  ProfileRepositoryTag,
  type ProfileRepository,
} from '@omoikane/application/profile';
import { ProfileIdSchema, type Profile } from '@omoikane/domain/profile';
import { WorkspaceInvitationAlreadyPendingError } from '../repository';
import {
  makeInviteWorkspaceMemberRepository,
  workspace,
  workspaceInvitation,
} from '../testing';
import { inviteWorkspaceMemberByUsername } from './invite-workspace-member-by-username';

const profile: Profile = {
  id: Schema.decodeUnknownSync(ProfileIdSchema)(
    '00000000-0000-4000-8000-000000000002'
  ),
  username: 'candidate',
  displayName: 'Candidate',
  avatarUrl: null,
  status: 'active',
};

const makeProfileLayer = (result: Profile | null) => {
  const findActiveByUsername = vi.fn(() => Effect.succeed(result));
  const repository: ProfileRepository = {
    findActiveByUsername,
    findCurrentById: () => Effect.dieMessage('Unexpected lookup'),
    listCurrentByIds: () => Effect.dieMessage('Unexpected list'),
    updateCurrent: () => Effect.dieMessage('Unexpected update'),
  };

  return {
    findActiveByUsername,
    layer: Layer.succeed(ProfileRepositoryTag, repository),
  };
};

describe('inviteWorkspaceMemberByUsername', () => {
  it('resolves a normalized exact username before creating an invitation', async () => {
    const profileStub = makeProfileLayer(profile);
    const workspaceStub = makeInviteWorkspaceMemberRepository(() =>
      Effect.succeed(workspaceInvitation)
    );

    const result = await Effect.runPromise(
      inviteWorkspaceMemberByUsername({
        workspaceId: ` ${workspace.id} `,
        username: ' candidate ',
      }).pipe(
        Effect.provide(
          Layer.merge(profileStub.layer, workspaceStub.repositoryLayer)
        )
      )
    );

    expect(profileStub.findActiveByUsername).toHaveBeenCalledWith('candidate');
    expect(workspaceStub.inviteMember).toHaveBeenCalledWith({
      workspaceId: workspace.id,
      profileId: profile.id,
    });
    expect(result).toEqual(workspaceInvitation);
  });

  it.each([
    [null, 'workspaceId'],
    [{ workspaceId: workspace.id, username: ' ' }, 'username'],
    [{ workspaceId: 'invalid', username: 'candidate' }, 'workspaceId'],
  ])('rejects invalid input before profile lookup', async (input, field) => {
    const profileStub = makeProfileLayer(profile);
    const workspaceStub = makeInviteWorkspaceMemberRepository(() =>
      Effect.succeed(workspaceInvitation)
    );

    const result = await Effect.runPromise(
      inviteWorkspaceMemberByUsername(input).pipe(
        Effect.provide(
          Layer.merge(profileStub.layer, workspaceStub.repositoryLayer)
        ),
        Effect.either
      )
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'InvalidWorkspaceInvitationCreationInputError',
        field,
      });
    }
    expect(profileStub.findActiveByUsername).not.toHaveBeenCalled();
  });

  it('does not create an invitation when no active profile is visible', async () => {
    const profileStub = makeProfileLayer(null);
    const workspaceStub = makeInviteWorkspaceMemberRepository(() =>
      Effect.succeed(workspaceInvitation)
    );

    const result = await Effect.runPromise(
      inviteWorkspaceMemberByUsername({
        workspaceId: workspace.id,
        username: 'missing',
      }).pipe(
        Effect.provide(
          Layer.merge(profileStub.layer, workspaceStub.repositoryLayer)
        ),
        Effect.either
      )
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: { _tag: 'WorkspaceInvitationCandidateNotFoundError' },
    });
    expect(workspaceStub.inviteMember).not.toHaveBeenCalled();
  });

  it('preserves invitation repository failures', async () => {
    const profileStub = makeProfileLayer(profile);
    const failure = new WorkspaceInvitationAlreadyPendingError({
      workspaceId: workspace.id,
      profileId: profile.id,
    });
    const workspaceStub = makeInviteWorkspaceMemberRepository(() =>
      Effect.fail(failure)
    );

    const result = await Effect.runPromise(
      inviteWorkspaceMemberByUsername({
        workspaceId: workspace.id,
        username: 'candidate',
      }).pipe(
        Effect.provide(
          Layer.merge(profileStub.layer, workspaceStub.repositoryLayer)
        ),
        Effect.either
      )
    );

    expect(result).toEqual(Either.left(failure));
  });
});
