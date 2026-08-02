import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import { WorkspaceInvitationCancellationNotAllowedError } from '../repository';
import {
  makeCancelWorkspaceInvitationRepository,
  workspaceInvitation,
} from '../testing';
import { cancelWorkspaceInvitation } from './cancel-workspace-invitation';

describe('cancelWorkspaceInvitation', () => {
  it('validates and forwards the invitation identity', async () => {
    const { cancelInvitation, repositoryLayer } =
      makeCancelWorkspaceInvitationRepository(() => Effect.void);

    await expect(
      Effect.runPromise(
        cancelWorkspaceInvitation({
          invitationId: ` ${workspaceInvitation.id} `,
        }).pipe(Effect.provide(repositoryLayer))
      )
    ).resolves.toBeUndefined();
    expect(cancelInvitation).toHaveBeenCalledWith(workspaceInvitation.id);
  });

  it('rejects invalid input before repository access', async () => {
    const { cancelInvitation, repositoryLayer } =
      makeCancelWorkspaceInvitationRepository(() => Effect.void);

    const result = await Effect.runPromise(
      cancelWorkspaceInvitation({ invitationId: null }).pipe(
        Effect.provide(repositoryLayer),
        Effect.either
      )
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: { _tag: 'InvalidWorkspaceInvitationCancellationInputError' },
    });
    expect(cancelInvitation).not.toHaveBeenCalled();
  });

  it('preserves cancellation-state failures', async () => {
    const failure = new WorkspaceInvitationCancellationNotAllowedError({
      invitationId: workspaceInvitation.id,
    });
    const { repositoryLayer } = makeCancelWorkspaceInvitationRepository(() =>
      Effect.fail(failure)
    );

    await expect(
      Effect.runPromise(
        cancelWorkspaceInvitation({
          invitationId: workspaceInvitation.id,
        }).pipe(Effect.provide(repositoryLayer), Effect.either)
      )
    ).resolves.toEqual(Either.left(failure));
  });
});
