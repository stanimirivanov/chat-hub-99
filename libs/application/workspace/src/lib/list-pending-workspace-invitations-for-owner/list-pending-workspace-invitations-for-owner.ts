import { Effect } from 'effect';
import {
  WorkspaceRepositoryTag,
  type PendingWorkspaceInvitationForOwner,
  type WorkspaceRepository,
} from '../repository';
import { decodeWorkspaceId } from '../workspace-identity/decode-workspace-id';
import {
  InvalidWorkspaceInvitationOwnerListInputError,
  type ListPendingWorkspaceInvitationsForOwnerError,
} from './list-pending-workspace-invitations-for-owner-error';

/**
 * Lists pending invitations for one selected workspace as an active owner.
 *
 * The returned Effect validates the raw identity before repository access and
 * requires `WorkspaceRepository` to be supplied.
 */
export const listPendingWorkspaceInvitationsForOwner = (
  input: unknown
): Effect.Effect<
  readonly PendingWorkspaceInvitationForOwner[],
  ListPendingWorkspaceInvitationsForOwnerError,
  WorkspaceRepository
> =>
  Effect.gen(function* () {
    const workspaceId = yield* decodeWorkspaceId(
      input,
      (cause) => new InvalidWorkspaceInvitationOwnerListInputError({ cause })
    );
    const repository = yield* WorkspaceRepositoryTag;
    return yield* repository.listPendingInvitationsForWorkspace(workspaceId);
  });
