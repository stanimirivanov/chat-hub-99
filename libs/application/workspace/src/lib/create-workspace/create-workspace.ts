import { Effect, Schema } from 'effect';
import {
  WorkspaceNameSchema,
  WorkspaceSlugSchema,
  type Workspace,
} from '@chat-hub/domain/workspace';
import {
  WorkspaceRepositoryTag,
  type CreateWorkspaceCommand,
  type WorkspaceRepository,
} from '../repository';
import {
  InvalidWorkspaceCreationInputError,
  type CreateWorkspaceError,
  type WorkspaceCreationField,
} from './create-workspace-error';

const decodeString = Schema.decodeUnknown(Schema.String);
const decodeWorkspaceName = Schema.decodeUnknown(WorkspaceNameSchema);
const decodeWorkspaceSlug = Schema.decodeUnknown(WorkspaceSlugSchema);

const readInputField = (
  input: unknown,
  field: WorkspaceCreationField
): unknown =>
  typeof input === 'object' && input !== null
    ? Reflect.get(input, field)
    : undefined;

const invalidField = (
  field: WorkspaceCreationField,
  cause: unknown
): InvalidWorkspaceCreationInputError =>
  new InvalidWorkspaceCreationInputError({ field, cause });

const decodeName = (
  input: unknown
): Effect.Effect<string, InvalidWorkspaceCreationInputError> =>
  decodeString(readInputField(input, 'name')).pipe(
    Effect.map((value) => value.trim()),
    Effect.flatMap(decodeWorkspaceName),
    Effect.mapError((cause) => invalidField('name', cause))
  );

const decodeSlug = (
  input: unknown
): Effect.Effect<string, InvalidWorkspaceCreationInputError> =>
  decodeString(readInputField(input, 'slug')).pipe(
    Effect.map((value) => value.trim().toLowerCase()),
    Effect.flatMap(decodeWorkspaceSlug),
    Effect.mapError((cause) => invalidField('slug', cause))
  );

const decodeDescription = (
  input: unknown
): Effect.Effect<string | null, InvalidWorkspaceCreationInputError> =>
  decodeString(readInputField(input, 'description') ?? '').pipe(
    Effect.map((value) => value.trim()),
    Effect.map((value) => (value.length === 0 ? null : value)),
    Effect.mapError((cause) => invalidField('description', cause))
  );

/**
 * Creates a workspace and initial owner membership for the authenticated user.
 *
 * Unknown boundary values are normalized and validated before repository
 * access. Identity and ownership are intentionally absent from the input
 * because the database command derives them from the authenticated provider
 * session.
 */
export const createWorkspace = (
  input: unknown
): Effect.Effect<Workspace, CreateWorkspaceError, WorkspaceRepository> =>
  Effect.gen(function* () {
    const command: CreateWorkspaceCommand = {
      name: yield* decodeName(input),
      slug: yield* decodeSlug(input),
      description: yield* decodeDescription(input),
    };

    const repository = yield* WorkspaceRepositoryTag;
    return yield* repository.create(command);
  });
