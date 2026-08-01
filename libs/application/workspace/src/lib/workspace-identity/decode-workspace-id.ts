import { Effect, Schema } from 'effect';
import {
  WorkspaceIdSchema,
  type WorkspaceId,
} from '@chat-hub/domain/workspace';

const decodeString = Schema.decodeUnknown(Schema.String);

const readWorkspaceId = (input: unknown): unknown =>
  typeof input === 'object' && input !== null
    ? Reflect.get(input, 'workspaceId')
    : undefined;

/**
 * Normalizes and validates the workspace identity shared by workspace command
 * boundaries. Each caller supplies its own typed validation-error factory.
 */
export const decodeWorkspaceId = <Failure>(
  input: unknown,
  invalid: (cause: unknown) => Failure
): Effect.Effect<WorkspaceId, Failure> =>
  decodeString(readWorkspaceId(input)).pipe(
    Effect.map((value) => value.trim()),
    Effect.flatMap(Schema.decodeUnknown(WorkspaceIdSchema)),
    Effect.mapError(invalid)
  );
