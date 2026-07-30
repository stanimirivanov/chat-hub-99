import { Effect } from 'effect';
import type { Workspace } from '@chat-hub/domain/workspace';
import {
  WorkspaceRepositoryTag,
  type WorkspaceRepository,
  type WorkspaceRepositoryError,
} from '../repository';

/**
 * Lists active workspaces visible to the current authenticated user.
 *
 * The Effect succeeds with an alphabetically ordered collection supplied by
 * the repository, fails with a technology-independent repository error, and
 * requires `WorkspaceRepository`.
 */
export const listAccessibleWorkspaces: Effect.Effect<
  readonly Workspace[],
  WorkspaceRepositoryError,
  WorkspaceRepository
> = Effect.gen(function* () {
  const repository = yield* WorkspaceRepositoryTag;
  return yield* repository.listAccessible();
});
