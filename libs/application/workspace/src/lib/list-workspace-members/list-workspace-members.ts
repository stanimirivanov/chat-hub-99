import { Effect } from 'effect';
import type { WorkspaceId, WorkspaceMember } from '@chat-hub/domain/workspace';
import {
  WorkspaceRepositoryTag,
  type WorkspaceMemberRepositoryReadError,
  type WorkspaceRepository,
} from '../repository';

/**
 * Lists active members visible within one selected workspace.
 *
 * The Effect succeeds with a stable membership collection, fails with a
 * technology-independent repository error, and requires
 * `WorkspaceRepository` to be supplied. Profile display data is deliberately
 * excluded so consumers can enrich identities through the profile capability.
 */
export const listWorkspaceMembers = (
  workspaceId: WorkspaceId
): Effect.Effect<
  readonly WorkspaceMember[],
  WorkspaceMemberRepositoryReadError,
  WorkspaceRepository
> =>
  Effect.gen(function* () {
    const repository = yield* WorkspaceRepositoryTag;
    return yield* repository.listActiveMembers(workspaceId);
  });
