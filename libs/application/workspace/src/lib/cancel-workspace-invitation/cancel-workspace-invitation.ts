import { Effect } from 'effect';
import {
  WorkspaceRepositoryTag,
  type WorkspaceRepository,
} from '../repository';
import { decodeWorkspaceInvitationId } from '../workspace-invitation-identity/decode-workspace-invitation-id';
import {
  InvalidWorkspaceInvitationCancellationInputError,
  type CancelWorkspaceInvitationError,
} from './cancel-workspace-invitation-error';

/** Cancels one pending invitation as an active owner of its workspace. */
export const cancelWorkspaceInvitation = (
  input: unknown
): Effect.Effect<void, CancelWorkspaceInvitationError, WorkspaceRepository> =>
  Effect.gen(function* () {
    const invitationId = yield* decodeWorkspaceInvitationId(
      input,
      (cause) => new InvalidWorkspaceInvitationCancellationInputError({ cause })
    );
    const repository = yield* WorkspaceRepositoryTag;
    return yield* repository.cancelInvitation(invitationId);
  });
