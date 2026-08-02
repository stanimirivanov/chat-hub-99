import { Effect } from 'effect';
import {
  WorkspaceRepositoryTag,
  type SuspendWorkspaceMemberCommand,
  type WorkspaceRepository,
} from '../repository';
import { decodeWorkspaceMemberMutation } from '../workspace-member-mutation/decode-workspace-member-mutation';
import {
  InvalidWorkspaceMemberSuspensionInputError,
  type SuspendWorkspaceMemberError,
} from './suspend-workspace-member-error';

/**
 * Suspends one active workspace member without replacing their identity.
 *
 * Target values and the optional audit reason are normalized before repository
 * access. The provider session remains the authority for the acting owner.
 */
export const suspendWorkspaceMember = (
  input: unknown
): Effect.Effect<void, SuspendWorkspaceMemberError, WorkspaceRepository> =>
  Effect.gen(function* () {
    const command: SuspendWorkspaceMemberCommand =
      yield* decodeWorkspaceMemberMutation(
        input,
        (field, cause) =>
          new InvalidWorkspaceMemberSuspensionInputError({ field, cause })
      );

    const repository = yield* WorkspaceRepositoryTag;
    return yield* repository.suspendMember(command);
  });
