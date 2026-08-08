import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import { WorkspaceRepositoryUnavailableError } from '../repository';
import {
  WORKSPACE_MEMBER_PAGE_SIZE,
  type WorkspaceMemberPage,
} from '../workspace-member-pagination';
import {
  makeListWorkspaceMembersRepository,
  workspace,
  workspaceMember,
} from '../testing';
import {
  InvalidWorkspaceMemberListInputError,
  listWorkspaceMembers,
} from './index';

const page: WorkspaceMemberPage = {
  members: [workspaceMember],
  nextCursor: null,
};

describe('listWorkspaceMembers', () => {
  it('validates and delegates one fixed-size member page', async () => {
    const { listActiveMembers, repositoryLayer } =
      makeListWorkspaceMembersRepository(() => Effect.succeed(page));

    const result = await Effect.runPromise(
      listWorkspaceMembers({
        workspaceId: workspace.id,
        after: undefined,
      }).pipe(Effect.provide(repositoryLayer))
    );

    expect(result).toBe(page);
    expect(listActiveMembers).toHaveBeenCalledExactlyOnceWith({
      workspaceId: workspace.id,
      after: undefined,
      limit: WORKSPACE_MEMBER_PAGE_SIZE,
    });
  });

  it('validates compound cursor input before repository access', async () => {
    const { listActiveMembers, repositoryLayer } =
      makeListWorkspaceMembersRepository(() => Effect.succeed(page));

    const result = await Effect.runPromise(
      listWorkspaceMembers({
        workspaceId: workspace.id,
        after: { role: 'owner', profileId: 'not-a-profile-id' },
      }).pipe(Effect.provide(repositoryLayer), Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(InvalidWorkspaceMemberListInputError);
    }
    expect(listActiveMembers).not.toHaveBeenCalled();
  });

  it('preserves the repository failure channel', async () => {
    const failure = new WorkspaceRepositoryUnavailableError({
      cause: new Error('Provider unavailable'),
    });
    const { repositoryLayer } = makeListWorkspaceMembersRepository(() =>
      Effect.fail(failure)
    );

    const result = await Effect.runPromise(
      listWorkspaceMembers({ workspaceId: workspace.id }).pipe(
        Effect.provide(repositoryLayer),
        Effect.either
      )
    );

    expect(result).toEqual(Either.left(failure));
  });
});
