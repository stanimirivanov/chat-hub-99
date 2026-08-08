import { Effect, Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  WORKSPACE_MEMBER_PAGE_SIZE,
  type ListActiveWorkspaceMembersQuery,
} from '@chat-hub/application/workspace';
import { ProfileIdSchema } from '@chat-hub/domain/profile';
import { WorkspaceIdSchema } from '@chat-hub/domain/workspace';
import {
  currentWorkspaceMemberRow,
  makeWorkspaceMemberListClientStub,
} from '../testing';
import { listWorkspaceMembers } from './list-workspace-members';

const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  '00000000-0000-4000-8000-000000000001'
);
const profileId = Schema.decodeUnknownSync(ProfileIdSchema)(
  currentWorkspaceMemberRow.user_id
);
const query: ListActiveWorkspaceMembersQuery = {
  workspaceId,
  limit: WORKSPACE_MEMBER_PAGE_SIZE,
};

describe('listWorkspaceMembers', () => {
  it('queries active memberships in stable role and identity order', async () => {
    const stub = makeWorkspaceMemberListClientStub({
      data: [currentWorkspaceMemberRow],
      error: null,
    });

    const result = await Effect.runPromise(
      listWorkspaceMembers(stub.client, query)
    );

    expect(stub.from).toHaveBeenCalledExactlyOnceWith(
      'current_workspace_memberships'
    );
    expect(stub.select).toHaveBeenCalledExactlyOnceWith(
      'workspace_id, user_id, membership_role'
    );
    expect(stub.eq).toHaveBeenNthCalledWith(1, 'workspace_id', workspaceId);
    expect(stub.eq).toHaveBeenNthCalledWith(2, 'membership_status', 'active');
    expect(stub.order).toHaveBeenNthCalledWith(1, 'membership_role', {
      ascending: false,
    });
    expect(stub.order).toHaveBeenNthCalledWith(2, 'user_id', {
      ascending: true,
    });
    expect(stub.limit).toHaveBeenCalledExactlyOnceWith(
      WORKSPACE_MEMBER_PAGE_SIZE + 1
    );
    expect(result).toEqual({
      members: [expect.objectContaining({ profileId })],
      nextCursor: null,
    });
  });

  it('applies a strict compound cursor and derives the next page', async () => {
    const stub = makeWorkspaceMemberListClientStub({
      data: Array.from(
        { length: WORKSPACE_MEMBER_PAGE_SIZE + 1 },
        () => currentWorkspaceMemberRow
      ),
      error: null,
    });

    const result = await Effect.runPromise(
      listWorkspaceMembers(stub.client, {
        ...query,
        after: { role: 'owner', profileId },
      })
    );

    expect(stub.or).toHaveBeenCalledExactlyOnceWith(
      `membership_role.lt.owner,and(membership_role.eq.owner,user_id.gt.${profileId})`
    );
    expect(result.nextCursor).toEqual({ role: 'owner', profileId });
    expect(result.members).toHaveLength(WORKSPACE_MEMBER_PAGE_SIZE);
  });

  it('translates PostgREST failures', async () => {
    const stub = makeWorkspaceMemberListClientStub({
      data: null,
      error: { code: '08006', message: 'Connection unavailable' },
    });

    const result = await Effect.runPromise(
      listWorkspaceMembers(stub.client, query).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('WorkspaceRepositoryUnavailableError');
    }
  });
});
