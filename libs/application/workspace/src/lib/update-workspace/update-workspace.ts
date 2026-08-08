import { Effect } from 'effect';
import type { Workspace } from '@omoikane/domain/workspace';
import {
  WorkspaceRepositoryTag,
  type UpdateWorkspaceCommand,
  type WorkspaceRepository,
} from '../repository';
import { decodeWorkspaceDetails } from '../workspace-details/decode-workspace-details';
import { decodeWorkspaceId } from '../workspace-identity/decode-workspace-id';
import {
  InvalidWorkspaceUpdateInputError,
  type UpdateWorkspaceError,
  type WorkspaceUpdateField,
} from './update-workspace-error';

const invalidField = (
  field: WorkspaceUpdateField,
  cause: unknown
): InvalidWorkspaceUpdateInputError =>
  new InvalidWorkspaceUpdateInputError({ field, cause });

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
    const workspaceId = yield* decodeWorkspaceId(input, (cause) =>
      invalidField('workspaceId', cause)
    );
    const details = yield* decodeWorkspaceDetails(input, invalidField);
    const command: UpdateWorkspaceCommand = { workspaceId, ...details };
    const repository = yield* WorkspaceRepositoryTag;

    return yield* repository.update(command);
  });
