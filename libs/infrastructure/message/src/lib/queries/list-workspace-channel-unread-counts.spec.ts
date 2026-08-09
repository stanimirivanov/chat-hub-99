import { Effect, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { WorkspaceIdSchema } from '@omoikane/domain/workspace';
import { listWorkspaceChannelUnreadCounts } from './list-workspace-channel-unread-counts';
import { makeRpcClientStub } from '../testing';

const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  '00000000-0000-4000-8000-000000000010'
);

describe('listWorkspaceChannelUnreadCounts', () => {
  it('executes the workspace-scoped query and validates rows', async () => {
    const { client, rpc } = makeRpcClientStub({
      data: [
        {
          channel_id: '00000000-0000-4000-8000-000000000011',
          unread_count: 2,
        },
      ],
      error: null,
    });

    const result = await Effect.runPromise(
      listWorkspaceChannelUnreadCounts(client, workspaceId)
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.unreadCount).toBe(2);
    expect(rpc).toHaveBeenCalledWith('list_workspace_channel_unread_counts', {
      p_workspace_id: workspaceId,
    });
  });
});
