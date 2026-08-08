import { Effect } from 'effect';
import {
  ProfileRepositoryTag,
  type ProfileRepository,
} from '@omoikane/application/profile';
import type { WorkspaceInvitation } from '@omoikane/domain/workspace';
import {
  WorkspaceRepositoryTag,
  type InviteWorkspaceMemberCommand,
  type WorkspaceRepository,
} from '../repository';
import { decodeWorkspaceMemberCandidate } from '../workspace-member-candidate/decode-workspace-member-candidate';
import {
  InvalidWorkspaceInvitationCreationInputError,
  WorkspaceInvitationCandidateNotFoundError,
  type InviteWorkspaceMemberByUsernameError,
} from './invite-workspace-member-by-username-error';

/**
 * Invites one active profile by exact username without granting access.
 *
 * The Effect validates input, resolves the active profile through the profile
 * port, and asks the workspace port to create a pending invitation. It requires
 * both repositories and preserves their provider-independent failure channels.
 */
export const inviteWorkspaceMemberByUsername = (
  input: unknown
): Effect.Effect<
  WorkspaceInvitation,
  InviteWorkspaceMemberByUsernameError,
  ProfileRepository | WorkspaceRepository
> =>
  Effect.gen(function* () {
    const { workspaceId, username } = yield* decodeWorkspaceMemberCandidate(
      input,
      (field, cause) =>
        new InvalidWorkspaceInvitationCreationInputError({ field, cause })
    );
    const profileRepository = yield* ProfileRepositoryTag;
    const profile = yield* profileRepository.findActiveByUsername(username);

    if (profile === null) {
      return yield* new WorkspaceInvitationCandidateNotFoundError({ username });
    }

    const command: InviteWorkspaceMemberCommand = {
      workspaceId,
      profileId: profile.id,
    };
    const workspaceRepository = yield* WorkspaceRepositoryTag;

    return yield* workspaceRepository.inviteMember(command);
  });
