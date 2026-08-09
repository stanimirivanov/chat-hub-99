import { Effect, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { ChannelIdSchema } from '@omoikane/domain/channel';
import { WorkspaceIdSchema } from '@omoikane/domain/workspace';
import { listWorkspaceChannelUnreadCounts } from './list-workspace-channel-unread-counts';
import { makeUnreadRepository } from '../testing';

const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  '00000000-0000-4000-8000-000000000010'
);
const channelId = Schema.decodeUnknownSync(ChannelIdSchema)(
  '00000000-0000-4000-8000-000000000011'
);

describe('listWorkspaceChannelUnreadCounts', () => {
  it('returns the repository snapshot for the selected workspace', async () => {
    const counts = [{ channelId, unreadCount: 3 }] as const;
    const { listUnreadByWorkspace, repositoryLayer } = makeUnreadRepository({
      listUnreadByWorkspace: () => Effect.succeed(counts),
    });

    const result = await Effect.runPromise(
      listWorkspaceChannelUnreadCounts(workspaceId).pipe(
        Effect.provide(repositoryLayer)
      )
    );

    expect(result).toEqual(counts);
    expect(listUnreadByWorkspace).toHaveBeenCalledWith(workspaceId);
  });
});
