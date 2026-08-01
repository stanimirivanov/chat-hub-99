import { Effect, Schema } from 'effect';
import { WorkspaceIdSchema, type Workspace } from '@chat-hub/domain/workspace';
import {
  WorkspaceRepositoryTag,
  type UpdateWorkspaceCommand,
  type WorkspaceRepository,
} from '../repository';
import { decodeWorkspaceDetails } from '../workspace-details/decode-workspace-details';
import {
  InvalidWorkspaceUpdateInputError,
  type UpdateWorkspaceError,
  type WorkspaceUpdateField,
} from './update-workspace-error';

const decodeString = Schema.decodeUnknown(Schema.String);

const readWorkspaceId = (input: unknown): unknown =>
  typeof input === 'object' && input !== null
    ? Reflect.get(input, 'workspaceId')
    : undefined;

const invalidField = (
  field: WorkspaceUpdateField,
  cause: unknown
): InvalidWorkspaceUpdateInputError =>
  new InvalidWorkspaceUpdateInputError({ field, cause });

const decodeWorkspaceId = (input: unknown) =>
  decodeString(readWorkspaceId(input)).pipe(
    Effect.map((value) => value.trim()),
    Effect.flatMap(Schema.decodeUnknown(WorkspaceIdSchema)),
    Effect.mapError((cause) => invalidField('workspaceId', cause))
  );

/**
 * Replaces the mutable details of one active workspace.
 *
 * Unknown boundary values are normalized and validated before repository
 * access. The returned Effect preserves typed authorization, slug-conflict,
 * provider, and row-validation failures and requires `WorkspaceRepository`.
 */
export const updateWorkspace = (
  input: unknown
): Effect.Effect<Workspace, UpdateWorkspaceError, WorkspaceRepository> =>
  Effect.gen(function* () {
    const workspaceId = yield* decodeWorkspaceId(input);
    const details = yield* decodeWorkspaceDetails(input, invalidField);
    const command: UpdateWorkspaceCommand = { workspaceId, ...details };
    const repository = yield* WorkspaceRepositoryTag;

    return yield* repository.update(command);
  });
