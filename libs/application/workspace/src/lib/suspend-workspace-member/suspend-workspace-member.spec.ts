import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  WorkspaceLastOwnerSuspensionError,
  type SuspendWorkspaceMemberCommand,
} from '../repository';
import {
  makeSuspendWorkspaceMemberRepository,
  workspace,
  workspaceMember,
} from '../testing';
import { suspendWorkspaceMember } from './suspend-workspace-member';

describe('suspendWorkspaceMember', () => {
  it('normalizes target identities and the optional audit reason', async () => {
    const { suspendMember, repositoryLayer } =
      makeSuspendWorkspaceMemberRepository(() => Effect.void);

    await Effect.runPromise(
      suspendWorkspaceMember({
        workspaceId: `  ${workspace.id}  `,
        profileId: `  ${workspaceMember.profileId}  `,
        reason: '  Temporary access hold  ',
      }).pipe(Effect.provide(repositoryLayer))
    );

    expect(suspendMember).toHaveBeenCalledExactlyOnceWith({
      workspaceId: workspace.id,
      profileId: workspaceMember.profileId,
      reason: 'Temporary access hold',
    } satisfies SuspendWorkspaceMemberCommand);
  });

  it.each([
    ['missing reason', {}],
    ['null reason', { reason: null }],
    ['blank reason', { reason: '   ' }],
  ])('normalizes %s to absence', async (_label, optionalInput) => {
    const { suspendMember, repositoryLayer } =
      makeSuspendWorkspaceMemberRepository(() => Effect.void);

    await Effect.runPromise(
      suspendWorkspaceMember({
        workspaceId: workspace.id,
        profileId: workspaceMember.profileId,
        ...optionalInput,
      }).pipe(Effect.provide(repositoryLayer))
    );

    expect(suspendMember).toHaveBeenCalledExactlyOnceWith({
      workspaceId: workspace.id,
      profileId: workspaceMember.profileId,
      reason: null,
    });
  });

  it.each([
    ['null input', null, 'workspaceId'],
    ['undefined input', undefined, 'workspaceId'],
    [
      'invalid profile identity',
      { workspaceId: workspace.id, profileId: 'not-a-profile-id' },
      'profileId',
    ],
    [
      'non-string reason',
      {
        workspaceId: workspace.id,
        profileId: workspaceMember.profileId,
        reason: 42,
      },
      'reason',
    ],
  ])('rejects %s before repository access', async (_label, input, field) => {
    const { suspendMember, repositoryLayer } =
      makeSuspendWorkspaceMemberRepository(() => Effect.void);

    const result = await Effect.runPromise(
      suspendWorkspaceMember(input).pipe(
        Effect.provide(repositoryLayer),
        Effect.either
      )
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'InvalidWorkspaceMemberSuspensionInputError',
        field,
      });
    }
    expect(suspendMember).not.toHaveBeenCalled();
  });

  it('preserves a last-owner suspension failure', async () => {
    const failure = new WorkspaceLastOwnerSuspensionError({
      workspaceId: workspace.id,
      profileId: workspaceMember.profileId,
    });
    const { repositoryLayer } = makeSuspendWorkspaceMemberRepository(() =>
      Effect.fail(failure)
    );

    const result = await Effect.runPromise(
      suspendWorkspaceMember({
        workspaceId: workspace.id,
        profileId: workspaceMember.profileId,
      }).pipe(Effect.provide(repositoryLayer), Effect.either)
    );

    expect(result).toEqual(Either.left(failure));
  });
});
