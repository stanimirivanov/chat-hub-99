import { Effect, Schema } from 'effect';
import { ProfileIdSchema, type ProfileId } from '@omoikane/domain/profile';
import {
  WorkspaceIdSchema,
  type WorkspaceId,
} from '@omoikane/domain/workspace';

export type WorkspaceMemberMutationField =
  | 'workspaceId'
  | 'profileId'
  | 'reason';

export interface WorkspaceMemberMutationCommand {
  readonly workspaceId: WorkspaceId;
  readonly profileId: ProfileId;
  readonly reason: string | null;
}

const decodeString = Schema.decodeUnknown(Schema.String);

const readInputField = (
  input: unknown,
  field: WorkspaceMemberMutationField
): unknown =>
  typeof input === 'object' && input !== null
    ? Reflect.get(input, field)
    : undefined;

/**
 * Normalizes the shared target and audit fields used by owner-driven
 * membership mutations. Each use case supplies its own typed boundary error,
 * keeping the public failure vocabularies distinct while sharing validation.
 */
export const decodeWorkspaceMemberMutation = <Failure>(
  input: unknown,
  invalidField: (field: WorkspaceMemberMutationField, cause: unknown) => Failure
): Effect.Effect<WorkspaceMemberMutationCommand, Failure> =>
  Effect.gen(function* () {
    const workspaceId = yield* decodeString(
      readInputField(input, 'workspaceId')
    ).pipe(
      Effect.map((value) => value.trim()),
      Effect.flatMap(Schema.decodeUnknown(WorkspaceIdSchema)),
      Effect.mapError((cause) => invalidField('workspaceId', cause))
    );

    const profileId = yield* decodeString(
      readInputField(input, 'profileId')
    ).pipe(
      Effect.map((value) => value.trim()),
      Effect.flatMap(Schema.decodeUnknown(ProfileIdSchema)),
      Effect.mapError((cause) => invalidField('profileId', cause))
    );

    const reason = yield* decodeString(
      readInputField(input, 'reason') ?? ''
    ).pipe(
      Effect.map((value) => value.trim()),
      Effect.map((value) => (value.length === 0 ? null : value)),
      Effect.mapError((cause) => invalidField('reason', cause))
    );

    return { workspaceId, profileId, reason };
  });
