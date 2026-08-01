import { Effect } from 'effect';
import {
  WorkspaceRepositoryTag,
  type WorkspaceRepository,
} from '../repository';
import { decodeWorkspaceId } from '../workspace-identity/decode-workspace-id';
import {
  InvalidWorkspaceArchiveInputError,
  type ArchiveWorkspaceError,
} from './archive-workspace-error';

/**
 * Archives one active workspace through the authenticated repository command.
 *
 * The workspace identity is validated before repository access. Success is an
 * acknowledgment rather than an active `Workspace` value; the repository has
 * already validated the archived provider result. The Effect preserves typed
 * command failures and requires `WorkspaceRepository`.
 */
export const archiveWorkspace = (
  input: unknown
): Effect.Effect<void, ArchiveWorkspaceError, WorkspaceRepository> =>
  Effect.gen(function* () {
    const workspaceId = yield* decodeWorkspaceId(
      input,
      (cause) => new InvalidWorkspaceArchiveInputError({ cause })
    );
    const repository = yield* WorkspaceRepositoryTag;

    return yield* repository.archive(workspaceId);
  });
