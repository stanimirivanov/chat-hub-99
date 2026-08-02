import { Effect } from 'effect';
import {
  WorkspaceRepositoryTag,
  type WorkspaceRepository,
} from '../repository';
import { decodeWorkspaceId } from '../workspace-identity/decode-workspace-id';
import {
  InvalidWorkspaceDepartureInputError,
  type LeaveWorkspaceError,
} from './leave-workspace-error';

/**
 * Removes the authenticated user's own membership from one active workspace.
 *
 * The workspace identity is validated before repository access. The actor is
 * not accepted as input: the provider session is the authority for which
 * membership may be removed. The Effect preserves typed lifecycle and
 * last-owner failures and requires `WorkspaceRepository`.
 */
export const leaveWorkspace = (
  input: unknown
): Effect.Effect<void, LeaveWorkspaceError, WorkspaceRepository> =>
  Effect.gen(function* () {
    const workspaceId = yield* decodeWorkspaceId(
      input,
      (cause) => new InvalidWorkspaceDepartureInputError({ cause })
    );
    const repository = yield* WorkspaceRepositoryTag;

    return yield* repository.leave(workspaceId);
  });
