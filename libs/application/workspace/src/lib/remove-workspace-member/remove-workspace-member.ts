import { Effect } from 'effect';
import {
  WorkspaceRepositoryTag,
  type RemoveWorkspaceMemberCommand,
  type WorkspaceRepository,
} from '../repository';
import { decodeWorkspaceMemberMutation } from '../workspace-member-mutation/decode-workspace-member-mutation';
import {
  InvalidWorkspaceMemberRemovalInputError,
  type RemoveWorkspaceMemberError,
} from './remove-workspace-member-error';

/**
 * Removes one active member from an active workspace.
 *
 * Unknown target values and the optional reason are normalized and validated
 * before repository access. The authenticated actor is absent because the
 * database command derives authorization from the provider session.
 */
export const removeWorkspaceMember = (
  input: unknown
): Effect.Effect<void, RemoveWorkspaceMemberError, WorkspaceRepository> =>
  Effect.gen(function* () {
    const command: RemoveWorkspaceMemberCommand =
      yield* decodeWorkspaceMemberMutation(
        input,
        (field, cause) =>
          new InvalidWorkspaceMemberRemovalInputError({ field, cause })
      );

    const repository = yield* WorkspaceRepositoryTag;
    return yield* repository.removeMember(command);
  });
