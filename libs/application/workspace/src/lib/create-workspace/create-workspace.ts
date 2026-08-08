import { Effect } from 'effect';
import type { Workspace } from '@omoikane/domain/workspace';
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
import { decodeWorkspaceDetails } from '../workspace-details/decode-workspace-details';

const invalidField = (
  field: WorkspaceCreationField,
  cause: unknown
): InvalidWorkspaceCreationInputError =>
  new InvalidWorkspaceCreationInputError({ field, cause });

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
    const details = yield* decodeWorkspaceDetails(input, invalidField);
    const command: CreateWorkspaceCommand = {
      ...details,
    };

    const repository = yield* WorkspaceRepositoryTag;
    return yield* repository.create(command);
  });
