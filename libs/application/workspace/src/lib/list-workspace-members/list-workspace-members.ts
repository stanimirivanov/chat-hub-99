import { Effect, Schema } from 'effect';
import { WorkspaceIdSchema } from '@omoikane/domain/workspace';
import {
  WorkspaceRepositoryTag,
  type WorkspaceRepository,
} from '../repository';
import {
  WORKSPACE_MEMBER_PAGE_SIZE,
  WorkspaceMemberCursorSchema,
  type WorkspaceMemberPage,
} from '../workspace-member-pagination';
import {
  InvalidWorkspaceMemberListInputError,
  type ListWorkspaceMembersError,
} from './list-workspace-members-error';

const ListWorkspaceMembersInputSchema = Schema.Struct({
  workspaceId: WorkspaceIdSchema,
  after: Schema.optional(WorkspaceMemberCursorSchema),
});

/**
 * Lists active members visible within one selected workspace.
 *
 * The Effect succeeds with one stable owner-first membership page, fails with
 * a technology-independent repository error, and requires
 * `WorkspaceRepository` to be supplied. Profile display data is deliberately
 * excluded so consumers can enrich identities through the profile capability.
 */
export const listWorkspaceMembers = (
  input: unknown
): Effect.Effect<
  WorkspaceMemberPage,
  ListWorkspaceMembersError,
  WorkspaceRepository
> =>
  Effect.gen(function* () {
    const { workspaceId, after } = yield* Schema.decodeUnknown(
      ListWorkspaceMembersInputSchema
    )(input).pipe(
      Effect.mapError(
        (cause) => new InvalidWorkspaceMemberListInputError({ cause })
      )
    );
    const repository = yield* WorkspaceRepositoryTag;
    return yield* repository.listActiveMembers({
      workspaceId,
      after,
      limit: WORKSPACE_MEMBER_PAGE_SIZE,
    });
  });
