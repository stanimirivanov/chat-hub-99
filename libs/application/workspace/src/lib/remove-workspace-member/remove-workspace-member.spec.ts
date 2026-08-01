import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  WorkspaceLastOwnerRemovalError,
  type RemoveWorkspaceMemberCommand,
} from '../repository';
import {
  makeRemoveWorkspaceMemberRepository,
  workspace,
  workspaceMember,
} from '../testing';
import { removeWorkspaceMember } from './remove-workspace-member';

describe('removeWorkspaceMember', () => {
  it('normalizes target identities and the optional audit reason', async () => {
    const { removeMember, repositoryLayer } =
      makeRemoveWorkspaceMemberRepository(() => Effect.void);

    await Effect.runPromise(
      removeWorkspaceMember({
        workspaceId: `  ${workspace.id}  `,
        profileId: `  ${workspaceMember.profileId}  `,
        reason: '  No longer participating  ',
      }).pipe(Effect.provide(repositoryLayer))
    );

    expect(removeMember).toHaveBeenCalledExactlyOnceWith({
      workspaceId: workspace.id,
      profileId: workspaceMember.profileId,
      reason: 'No longer participating',
    } satisfies RemoveWorkspaceMemberCommand);
  });

  it.each([
    ['missing reason', {}],
    ['null reason', { reason: null }],
    ['blank reason', { reason: '   ' }],
  ])('normalizes %s to absence', async (_label, optionalInput) => {
    const { removeMember, repositoryLayer } =
      makeRemoveWorkspaceMemberRepository(() => Effect.void);

    await Effect.runPromise(
      removeWorkspaceMember({
        workspaceId: workspace.id,
        profileId: workspaceMember.profileId,
        ...optionalInput,
      }).pipe(Effect.provide(repositoryLayer))
    );

    expect(removeMember).toHaveBeenCalledExactlyOnceWith({
      workspaceId: workspace.id,
      profileId: workspaceMember.profileId,
      reason: null,
    });
  });

  it.each([
    ['null input', null, 'workspaceId'],
    ['undefined input', undefined, 'workspaceId'],
    [
      'invalid workspace identity',
      {
        workspaceId: 'not-a-workspace-id',
        profileId: workspaceMember.profileId,
      },
      'workspaceId',
    ],
    ['missing profile identity', { workspaceId: workspace.id }, 'profileId'],
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
    const { removeMember, repositoryLayer } =
      makeRemoveWorkspaceMemberRepository(() => Effect.void);

    const result = await Effect.runPromise(
      removeWorkspaceMember(input).pipe(
        Effect.provide(repositoryLayer),
        Effect.either
      )
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'InvalidWorkspaceMemberRemovalInputError',
        field,
      });
    }
    expect(removeMember).not.toHaveBeenCalled();
  });

  it('preserves a last-owner removal failure', async () => {
    const failure = new WorkspaceLastOwnerRemovalError({
      workspaceId: workspace.id,
      profileId: workspaceMember.profileId,
    });
    const { repositoryLayer } = makeRemoveWorkspaceMemberRepository(() =>
      Effect.fail(failure)
    );

    const result = await Effect.runPromise(
      removeWorkspaceMember({
        workspaceId: workspace.id,
        profileId: workspaceMember.profileId,
      }).pipe(Effect.provide(repositoryLayer), Effect.either)
    );

    expect(result).toEqual(Either.left(failure));
  });
});
