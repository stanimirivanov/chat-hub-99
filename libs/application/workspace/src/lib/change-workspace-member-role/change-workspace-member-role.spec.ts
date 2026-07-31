import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  WorkspaceLastOwnerDemotionError,
  type ChangeWorkspaceMemberRoleCommand,
} from '../repository';
import {
  makeChangeWorkspaceMemberRoleRepository,
  workspace,
  workspaceMember,
} from '../testing';
import { changeWorkspaceMemberRole } from './change-workspace-member-role';

describe('changeWorkspaceMemberRole', () => {
  it('normalizes role values and passes validated identities to the repository', async () => {
    const promotedMember = { ...workspaceMember, role: 'member' as const };
    const { changeMemberRole, repositoryLayer } =
      makeChangeWorkspaceMemberRoleRepository(() =>
        Effect.succeed(promotedMember)
      );

    const result = await Effect.runPromise(
      changeWorkspaceMemberRole({
        workspaceId: `  ${workspace.id}  `,
        profileId: `  ${workspaceMember.profileId}  `,
        role: '  MEMBER  ',
      }).pipe(Effect.provide(repositoryLayer))
    );

    expect(result).toBe(promotedMember);
    expect(changeMemberRole).toHaveBeenCalledExactlyOnceWith({
      workspaceId: workspace.id,
      profileId: workspaceMember.profileId,
      role: 'member',
    } satisfies ChangeWorkspaceMemberRoleCommand);
  });

  it.each([
    ['null input', null, 'workspaceId'],
    ['undefined input', undefined, 'workspaceId'],
    [
      'invalid workspace identity',
      {
        workspaceId: 'not-a-workspace-id',
        profileId: workspaceMember.profileId,
        role: 'owner',
      },
      'workspaceId',
    ],
    [
      'missing profile identity',
      { workspaceId: workspace.id, role: 'owner' },
      'profileId',
    ],
    [
      'invalid role',
      {
        workspaceId: workspace.id,
        profileId: workspaceMember.profileId,
        role: 'administrator',
      },
      'role',
    ],
    [
      'null role',
      {
        workspaceId: workspace.id,
        profileId: workspaceMember.profileId,
        role: null,
      },
      'role',
    ],
  ])('rejects %s before repository access', async (_label, input, field) => {
    const { changeMemberRole, repositoryLayer } =
      makeChangeWorkspaceMemberRoleRepository(() =>
        Effect.succeed(workspaceMember)
      );

    const result = await Effect.runPromise(
      changeWorkspaceMemberRole(input).pipe(
        Effect.provide(repositoryLayer),
        Effect.either
      )
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'InvalidWorkspaceMemberRoleChangeInputError',
        field,
      });
    }
    expect(changeMemberRole).not.toHaveBeenCalled();
  });

  it('preserves a last-owner failure', async () => {
    const failure = new WorkspaceLastOwnerDemotionError({
      workspaceId: workspace.id,
      profileId: workspaceMember.profileId,
    });
    const { repositoryLayer } = makeChangeWorkspaceMemberRoleRepository(() =>
      Effect.fail(failure)
    );

    const result = await Effect.runPromise(
      changeWorkspaceMemberRole({
        workspaceId: workspace.id,
        profileId: workspaceMember.profileId,
        role: 'member',
      }).pipe(Effect.provide(repositoryLayer), Effect.either)
    );

    expect(result).toEqual(Either.left(failure));
  });
});
