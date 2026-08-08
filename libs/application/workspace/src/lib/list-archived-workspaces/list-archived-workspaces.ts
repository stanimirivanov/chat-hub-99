import { Effect } from 'effect';
import type { ArchivedWorkspace } from '@chat-hub/domain/workspace';
import {
  WorkspaceRepositoryTag,
  type WorkspaceRepository,
  type WorkspaceRepositoryReadError,
} from '../repository';

/**
 * Lists archived workspaces still visible to the authenticated member.
 *
 * The separate result type prevents callers from placing archived projections
 * in active workspace navigation.
 */
export const listArchivedWorkspaces: Effect.Effect<
  readonly ArchivedWorkspace[],
  WorkspaceRepositoryReadError,
  WorkspaceRepository
> = Effect.gen(function* () {
  const repository = yield* WorkspaceRepositoryTag;
  return yield* repository.listArchived();
});
