import { Effect, Schema } from 'effect';
import {
  WorkspaceIdSchema,
  type WorkspaceId,
} from '@chat-hub/domain/workspace';

export type WorkspaceMemberCandidateField = 'workspaceId' | 'username';

export interface WorkspaceMemberCandidate {
  readonly workspaceId: WorkspaceId;
  readonly username: string;
}

const decodeString = Schema.decodeUnknown(Schema.String);

const readInputField = (
  input: unknown,
  field: WorkspaceMemberCandidateField
): unknown =>
  typeof input === 'object' && input !== null
    ? Reflect.get(input, field)
    : undefined;

/**
 * Normalizes the exact-username candidate shared by direct addition and
 * consent-based invitation workflows. Callers retain their own error type.
 */
export const decodeWorkspaceMemberCandidate = <Failure>(
  input: unknown,
  invalidField: (
    field: WorkspaceMemberCandidateField,
    cause: unknown
  ) => Failure
): Effect.Effect<WorkspaceMemberCandidate, Failure> =>
  Effect.all({
    workspaceId: decodeString(readInputField(input, 'workspaceId')).pipe(
      Effect.map((value) => value.trim()),
      Effect.flatMap(Schema.decodeUnknown(WorkspaceIdSchema)),
      Effect.mapError((cause) => invalidField('workspaceId', cause))
    ),
    username: decodeString(readInputField(input, 'username')).pipe(
      Effect.map((value) => value.trim()),
      Effect.flatMap(Schema.decodeUnknown(Schema.NonEmptyTrimmedString)),
      Effect.mapError((cause) => invalidField('username', cause))
    ),
  });
