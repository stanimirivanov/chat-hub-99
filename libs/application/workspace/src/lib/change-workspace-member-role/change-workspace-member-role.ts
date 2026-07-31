import { Effect, Schema } from 'effect';
import { ProfileIdSchema } from '@chat-hub/domain/profile';
import {
  WorkspaceIdSchema,
  WorkspaceMemberRoleSchema,
  type WorkspaceMember,
} from '@chat-hub/domain/workspace';
import {
  WorkspaceRepositoryTag,
  type ChangeWorkspaceMemberRoleCommand,
  type WorkspaceRepository,
} from '../repository';
import {
  InvalidWorkspaceMemberRoleChangeInputError,
  type ChangeWorkspaceMemberRoleError,
  type WorkspaceMemberRoleChangeField,
} from './change-workspace-member-role-error';

const decodeString = Schema.decodeUnknown(Schema.String);

const readInputField = (
  input: unknown,
  field: WorkspaceMemberRoleChangeField
): unknown =>
  typeof input === 'object' && input !== null
    ? Reflect.get(input, field)
    : undefined;

const decodeField = <A>(
  input: unknown,
  field: WorkspaceMemberRoleChangeField,
  schema: Schema.Schema<A, string>
): Effect.Effect<A, InvalidWorkspaceMemberRoleChangeInputError> =>
  decodeString(readInputField(input, field)).pipe(
    Effect.map((value) => value.trim()),
    Effect.flatMap(Schema.decodeUnknown(schema)),
    Effect.mapError(
      (cause) =>
        new InvalidWorkspaceMemberRoleChangeInputError({ field, cause })
    )
  );

/**
 * Changes one active member's role in an active workspace.
 *
 * Unknown input is normalized and validated before repository access. The
 * authenticated actor is intentionally absent: the database command derives
 * authorization from the provider session and protects the last-owner rule.
 */
export const changeWorkspaceMemberRole = (
  input: unknown
): Effect.Effect<
  WorkspaceMember,
  ChangeWorkspaceMemberRoleError,
  WorkspaceRepository
> =>
  Effect.gen(function* () {
    const command: ChangeWorkspaceMemberRoleCommand = {
      workspaceId: yield* decodeField(input, 'workspaceId', WorkspaceIdSchema),
      profileId: yield* decodeField(input, 'profileId', ProfileIdSchema),
      role: yield* decodeString(readInputField(input, 'role')).pipe(
        Effect.map((value) => value.trim().toLowerCase()),
        Effect.flatMap(Schema.decodeUnknown(WorkspaceMemberRoleSchema)),
        Effect.mapError(
          (cause) =>
            new InvalidWorkspaceMemberRoleChangeInputError({
              field: 'role',
              cause,
            })
        )
      ),
    };

    const repository = yield* WorkspaceRepositoryTag;
    return yield* repository.changeMemberRole(command);
  });
