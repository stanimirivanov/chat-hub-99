import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import { WorkspaceInvitationResponseNotAllowedError } from '../repository';
import {
  makeDeclineWorkspaceInvitationRepository,
  workspaceInvitation,
} from '../testing';
import { declineWorkspaceInvitation } from './decline-workspace-invitation';

describe('declineWorkspaceInvitation', () => {
  it('validates and forwards the invitation identity', async () => {
    const { declineInvitation, repositoryLayer } =
      makeDeclineWorkspaceInvitationRepository(() => Effect.void);

    await expect(
      Effect.runPromise(
        declineWorkspaceInvitation({
          invitationId: workspaceInvitation.id,
        }).pipe(Effect.provide(repositoryLayer))
      )
    ).resolves.toBeUndefined();
    expect(declineInvitation).toHaveBeenCalledWith(workspaceInvitation.id);
  });

  it('rejects invalid input and preserves response-state failures', async () => {
    const failure = new WorkspaceInvitationResponseNotAllowedError({
      invitationId: workspaceInvitation.id,
    });
    const { declineInvitation, repositoryLayer } =
      makeDeclineWorkspaceInvitationRepository(() => Effect.fail(failure));

    const invalid = await Effect.runPromise(
      declineWorkspaceInvitation(null).pipe(
        Effect.provide(repositoryLayer),
        Effect.either
      )
    );
    expect(invalid).toMatchObject({
      _tag: 'Left',
      left: { _tag: 'InvalidWorkspaceInvitationDeclineInputError' },
    });

    const failed = await Effect.runPromise(
      declineWorkspaceInvitation({
        invitationId: workspaceInvitation.id,
      }).pipe(Effect.provide(repositoryLayer), Effect.either)
    );
    expect(failed).toEqual(Either.left(failure));
    expect(declineInvitation).toHaveBeenCalledOnce();
  });
});
