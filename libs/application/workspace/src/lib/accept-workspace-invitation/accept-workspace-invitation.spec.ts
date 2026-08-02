import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import { WorkspaceInvitationResponseNotAllowedError } from '../repository';
import {
  makeAcceptWorkspaceInvitationRepository,
  workspaceInvitation,
  workspaceMember,
} from '../testing';
import { acceptWorkspaceInvitation } from './accept-workspace-invitation';

describe('acceptWorkspaceInvitation', () => {
  it('validates and forwards the invitation identity', async () => {
    const { acceptInvitation, repositoryLayer } =
      makeAcceptWorkspaceInvitationRepository(() =>
        Effect.succeed(workspaceMember)
      );

    await expect(
      Effect.runPromise(
        acceptWorkspaceInvitation({
          invitationId: ` ${workspaceInvitation.id} `,
        }).pipe(Effect.provide(repositoryLayer))
      )
    ).resolves.toEqual(workspaceMember);
    expect(acceptInvitation).toHaveBeenCalledWith(workspaceInvitation.id);
  });

  it('rejects an invalid identity before repository access', async () => {
    const { acceptInvitation, repositoryLayer } =
      makeAcceptWorkspaceInvitationRepository(() =>
        Effect.succeed(workspaceMember)
      );

    const result = await Effect.runPromise(
      acceptWorkspaceInvitation({ invitationId: '' }).pipe(
        Effect.provide(repositoryLayer),
        Effect.either
      )
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: { _tag: 'InvalidWorkspaceInvitationAcceptanceInputError' },
    });
    expect(acceptInvitation).not.toHaveBeenCalled();
  });

  it('preserves response-state failures', async () => {
    const failure = new WorkspaceInvitationResponseNotAllowedError({
      invitationId: workspaceInvitation.id,
    });
    const { repositoryLayer } = makeAcceptWorkspaceInvitationRepository(() =>
      Effect.fail(failure)
    );

    await expect(
      Effect.runPromise(
        acceptWorkspaceInvitation({
          invitationId: workspaceInvitation.id,
        }).pipe(Effect.provide(repositoryLayer), Effect.either)
      )
    ).resolves.toEqual(Either.left(failure));
  });
});
