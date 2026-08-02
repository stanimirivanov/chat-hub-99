import { Effect } from 'effect';
import {
  WorkspaceRepositoryTag,
  type WorkspaceRepository,
} from '../repository';
import { decodeWorkspaceInvitationId } from '../workspace-invitation-identity/decode-workspace-invitation-id';
import {
  InvalidWorkspaceInvitationDeclineInputError,
  type DeclineWorkspaceInvitationError,
} from './decline-workspace-invitation-error';

/** Declines one pending invitation as its provider-authenticated recipient. */
export const declineWorkspaceInvitation = (
  input: unknown
): Effect.Effect<void, DeclineWorkspaceInvitationError, WorkspaceRepository> =>
  Effect.gen(function* () {
    const invitationId = yield* decodeWorkspaceInvitationId(
      input,
      (cause) => new InvalidWorkspaceInvitationDeclineInputError({ cause })
    );
    const repository = yield* WorkspaceRepositoryTag;
    return yield* repository.declineInvitation(invitationId);
  });
