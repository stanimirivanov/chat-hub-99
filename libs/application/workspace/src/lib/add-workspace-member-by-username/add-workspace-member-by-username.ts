import { Effect } from 'effect';
import {
  ProfileRepositoryTag,
  type ProfileRepository,
} from '@omoikane/application/profile';
import type { Profile } from '@omoikane/domain/profile';
import { type WorkspaceMember } from '@omoikane/domain/workspace';
import {
  WorkspaceRepositoryTag,
  type AddWorkspaceMemberCommand,
  type WorkspaceRepository,
} from '../repository';
import {
  InvalidWorkspaceMemberAdditionInputError,
  WorkspaceMemberCandidateNotFoundError,
  type AddWorkspaceMemberByUsernameError,
} from './add-workspace-member-by-username-error';
import { decodeWorkspaceMemberCandidate } from '../workspace-member-candidate/decode-workspace-member-candidate';

/**
 * Active member and profile projections produced by addition or reactivation.
 */
export interface AddedWorkspaceMember {
  readonly member: WorkspaceMember;
  readonly profile: Profile;
}

/**
 * Adds or reactivates an active profile by exact username.
 *
 * The use case validates boundary input, resolves one active profile through
 * the profile port, and then asks the workspace port to produce an active
 * default-member projection. Existing left, removed, or suspended history is
 * preserved and reactivated by the repository implementation. Its Effect
 * requires both repositories and preserves each capability's typed failures.
 */
export const addWorkspaceMemberByUsername = (
  input: unknown
): Effect.Effect<
  AddedWorkspaceMember,
  AddWorkspaceMemberByUsernameError,
  ProfileRepository | WorkspaceRepository
> =>
  Effect.gen(function* () {
    const { workspaceId, username } = yield* decodeWorkspaceMemberCandidate(
      input,
      (field, cause) =>
        new InvalidWorkspaceMemberAdditionInputError({ field, cause })
    );
    const profileRepository = yield* ProfileRepositoryTag;
    const profile = yield* profileRepository.findActiveByUsername(username);

    if (profile === null) {
      return yield* new WorkspaceMemberCandidateNotFoundError({ username });
    }

    const command: AddWorkspaceMemberCommand = {
      workspaceId,
      profileId: profile.id,
    };
    const workspaceRepository = yield* WorkspaceRepositoryTag;
    const member = yield* workspaceRepository.addMember(command);

    return { member, profile };
  });
