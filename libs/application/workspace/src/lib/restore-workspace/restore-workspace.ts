import { Effect } from 'effect';
import type { Workspace } from '@chat-hub/domain/workspace';
import {
  WorkspaceRepositoryTag,
  type WorkspaceRepository,
} from '../repository';
import { decodeWorkspaceId } from '../workspace-identity/decode-workspace-id';
import {
  InvalidWorkspaceRestoreInputError,
  type RestoreWorkspaceError,
} from './restore-workspace-error';

/** Restores one archived workspace through authenticated owner authority. */
export const restoreWorkspace = (
  input: unknown
): Effect.Effect<Workspace, RestoreWorkspaceError, WorkspaceRepository> =>
  Effect.gen(function* () {
    const workspaceId = yield* decodeWorkspaceId(
      input,
      (cause) => new InvalidWorkspaceRestoreInputError({ cause })
    );
    const repository = yield* WorkspaceRepositoryTag;

    return yield* repository.restore(workspaceId);
  });
