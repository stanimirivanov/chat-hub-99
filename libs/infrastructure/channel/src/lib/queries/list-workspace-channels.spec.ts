import { Effect, Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { WorkspaceIdSchema } from '@omoikane/domain/workspace';
import { currentChannelRow, makeChannelListClientStub } from '../testing';
import { listWorkspaceChannels } from './list-workspace-channels';

const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  '00000000-0000-4000-8000-000000000002'
);

describe('listWorkspaceChannels', () => {
  it('queries active channels in the selected workspace and stable order', async () => {
    const stub = makeChannelListClientStub({
      data: [currentChannelRow],
      error: null,
    });

    const result = await Effect.runPromise(
      listWorkspaceChannels(stub.client, workspaceId)
    );

    expect(result).toHaveLength(1);
    expect(stub.from).toHaveBeenCalledExactlyOnceWith('current_channels');
    expect(stub.select).toHaveBeenCalledExactlyOnceWith(
      'channel_id, workspace_id, name, slug, description'
    );
    expect(stub.eq).toHaveBeenNthCalledWith(1, 'workspace_id', workspaceId);
    expect(stub.eq).toHaveBeenNthCalledWith(2, 'channel_status', 'active');
    expect(stub.order).toHaveBeenNthCalledWith(1, 'name', {
      ascending: true,
    });
    expect(stub.order).toHaveBeenNthCalledWith(2, 'channel_id', {
      ascending: true,
    });
  });

  it('translates PostgREST failures', async () => {
    const stub = makeChannelListClientStub({
      data: null,
      error: { code: '08006', message: 'Connection unavailable' },
    });

    const result = await Effect.runPromise(
      listWorkspaceChannels(stub.client, workspaceId).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('ChannelRepositoryUnavailableError');
    }
  });
});
