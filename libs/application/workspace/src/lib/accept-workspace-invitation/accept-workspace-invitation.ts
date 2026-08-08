import { Effect } from 'effect';
import type { WorkspaceMember } from '@omoikane/domain/workspace';
import {
  WorkspaceRepositoryTag,
  type WorkspaceRepository,
} from '../repository';
import { decodeWorkspaceInvitationId } from '../workspace-invitation-identity/decode-workspace-invitation-id';
import {
  InvalidWorkspaceInvitationAcceptanceInputError,
  type AcceptWorkspaceInvitationError,
} from './accept-workspace-invitation-error';

/** Accepts one pending invitation as its provider-authenticated recipient. */
export const acceptWorkspaceInvitation = (
  input: unknown
): Effect.Effect<
  WorkspaceMember,
  AcceptWorkspaceInvitationError,
  WorkspaceRepository
> =>
  Effect.gen(function* () {
    const invitationId = yield* decodeWorkspaceInvitationId(
      input,
      (cause) => new InvalidWorkspaceInvitationAcceptanceInputError({ cause })
    );
    const repository = yield* WorkspaceRepositoryTag;
    return yield* repository.acceptInvitation(invitationId);
  });
