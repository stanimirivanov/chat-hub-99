import { Effect, Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { WorkspaceIdSchema } from '@chat-hub/domain/workspace';
import {
  currentWorkspaceMemberRow,
  makeWorkspaceMemberListClientStub,
} from '../testing';
import { listWorkspaceMembers } from './list-workspace-members';

const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  '00000000-0000-4000-8000-000000000001'
);

describe('listWorkspaceMembers', () => {
  it('queries active memberships in stable role and identity order', async () => {
    const stub = makeWorkspaceMemberListClientStub({
      data: [currentWorkspaceMemberRow],
      error: null,
    });

    const result = await Effect.runPromise(
      listWorkspaceMembers(stub.client, workspaceId)
    );

    expect(result).toHaveLength(1);
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
  });

  it('translates PostgREST failures', async () => {
    const stub = makeWorkspaceMemberListClientStub({
      data: null,
      error: { code: '08006', message: 'Connection unavailable' },
    });

    const result = await Effect.runPromise(
      listWorkspaceMembers(stub.client, workspaceId).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('WorkspaceRepositoryUnavailableError');
    }
  });
});
