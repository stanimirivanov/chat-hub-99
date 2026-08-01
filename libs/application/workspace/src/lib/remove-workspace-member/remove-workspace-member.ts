import { Effect, Schema } from 'effect';
import { ProfileIdSchema } from '@chat-hub/domain/profile';
import { WorkspaceIdSchema } from '@chat-hub/domain/workspace';
import {
  WorkspaceRepositoryTag,
  type RemoveWorkspaceMemberCommand,
  type WorkspaceRepository,
} from '../repository';
import {
  InvalidWorkspaceMemberRemovalInputError,
  type RemoveWorkspaceMemberError,
  type WorkspaceMemberRemovalField,
} from './remove-workspace-member-error';

const decodeString = Schema.decodeUnknown(Schema.String);

const readInputField = (
  input: unknown,
  field: WorkspaceMemberRemovalField
): unknown =>
  typeof input === 'object' && input !== null
    ? Reflect.get(input, field)
    : undefined;

const invalidField = (
  field: WorkspaceMemberRemovalField,
  cause: unknown
): InvalidWorkspaceMemberRemovalInputError =>
  new InvalidWorkspaceMemberRemovalInputError({ field, cause });

const decodeWorkspaceId = (
  input: unknown
): Effect.Effect<
  RemoveWorkspaceMemberCommand['workspaceId'],
  InvalidWorkspaceMemberRemovalInputError
> =>
  decodeString(readInputField(input, 'workspaceId')).pipe(
    Effect.map((value) => value.trim()),
    Effect.flatMap(Schema.decodeUnknown(WorkspaceIdSchema)),
    Effect.mapError((cause) => invalidField('workspaceId', cause))
  );

const decodeProfileId = (
  input: unknown
): Effect.Effect<
  RemoveWorkspaceMemberCommand['profileId'],
  InvalidWorkspaceMemberRemovalInputError
> =>
  decodeString(readInputField(input, 'profileId')).pipe(
    Effect.map((value) => value.trim()),
    Effect.flatMap(Schema.decodeUnknown(ProfileIdSchema)),
    Effect.mapError((cause) => invalidField('profileId', cause))
  );

const decodeReason = (
  input: unknown
): Effect.Effect<string | null, InvalidWorkspaceMemberRemovalInputError> =>
  decodeString(readInputField(input, 'reason') ?? '').pipe(
    Effect.map((value) => value.trim()),
    Effect.map((value) => (value.length === 0 ? null : value)),
    Effect.mapError((cause) => invalidField('reason', cause))
  );

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
    const command: RemoveWorkspaceMemberCommand = {
      workspaceId: yield* decodeWorkspaceId(input),
      profileId: yield* decodeProfileId(input),
      reason: yield* decodeReason(input),
    };

    const repository = yield* WorkspaceRepositoryTag;
    return yield* repository.removeMember(command);
  });
