import { Effect, Schema } from 'effect';
import {
  WorkspaceInvitationIdSchema,
  type WorkspaceInvitationId,
} from '@chat-hub/domain/workspace';

const decodeString = Schema.decodeUnknown(Schema.String);

/**
 * Normalizes a raw invitation identifier shared by recipient responses.
 */
export const decodeWorkspaceInvitationId = <Failure>(
  input: unknown,
  invalid: (cause: unknown) => Failure
): Effect.Effect<WorkspaceInvitationId, Failure> => {
  const value =
    typeof input === 'object' && input !== null
      ? Reflect.get(input, 'invitationId')
      : undefined;

  return decodeString(value).pipe(
    Effect.map((invitationId) => invitationId.trim()),
    Effect.flatMap(Schema.decodeUnknown(WorkspaceInvitationIdSchema)),
    Effect.mapError(invalid)
  );
};
