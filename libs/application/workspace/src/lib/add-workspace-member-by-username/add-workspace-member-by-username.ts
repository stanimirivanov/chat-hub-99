import { Effect, Schema } from 'effect';
import {
  ProfileRepositoryTag,
  type ProfileRepository,
} from '@chat-hub/application/profile';
import type { Profile } from '@chat-hub/domain/profile';
import {
  WorkspaceIdSchema,
  type WorkspaceMember,
} from '@chat-hub/domain/workspace';
import {
  WorkspaceRepositoryTag,
  type AddWorkspaceMemberCommand,
  type WorkspaceRepository,
} from '../repository';
import {
  InvalidWorkspaceMemberAdditionInputError,
  WorkspaceMemberCandidateNotFoundError,
  type AddWorkspaceMemberByUsernameError,
  type WorkspaceMemberAdditionField,
} from './add-workspace-member-by-username-error';

const decodeString = Schema.decodeUnknown(Schema.String);

const readInputField = (
  input: unknown,
  field: WorkspaceMemberAdditionField
): unknown =>
  typeof input === 'object' && input !== null
    ? Reflect.get(input, field)
    : undefined;

const invalidField = (
  field: WorkspaceMemberAdditionField,
  cause: unknown
): InvalidWorkspaceMemberAdditionInputError =>
  new InvalidWorkspaceMemberAdditionInputError({ field, cause });

const decodeWorkspaceId = (input: unknown) =>
  decodeString(readInputField(input, 'workspaceId')).pipe(
    Effect.map((value) => value.trim()),
    Effect.flatMap(Schema.decodeUnknown(WorkspaceIdSchema)),
    Effect.mapError((cause) => invalidField('workspaceId', cause))
  );

const decodeUsername = (
  input: unknown
): Effect.Effect<string, InvalidWorkspaceMemberAdditionInputError> =>
  decodeString(readInputField(input, 'username')).pipe(
    Effect.map((value) => value.trim()),
    Effect.flatMap(Schema.decodeUnknown(Schema.NonEmptyTrimmedString)),
    Effect.mapError((cause) => invalidField('username', cause))
  );

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
 * default-member projection. Existing left or removed history is preserved and
 * reactivated by the repository implementation. Its Effect requires both
 * repositories and preserves each capability's typed failures.
 */
export const addWorkspaceMemberByUsername = (
  input: unknown
): Effect.Effect<
  AddedWorkspaceMember,
  AddWorkspaceMemberByUsernameError,
  ProfileRepository | WorkspaceRepository
> =>
  Effect.gen(function* () {
    const workspaceId = yield* decodeWorkspaceId(input);
    const username = yield* decodeUsername(input);
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
