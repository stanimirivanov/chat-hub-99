import { Effect, Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { WorkspaceIdSchema } from '@omoikane/domain/workspace';
import { archivedChannelRow, makeChannelListClientStub } from '../testing';
import { listArchivedWorkspaceChannels } from './list-archived-workspace-channels';

const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  archivedChannelRow.workspace_id
);

describe('listArchivedWorkspaceChannels', () => {
  it('queries archived channels newest first within one workspace', async () => {
    const stub = makeChannelListClientStub({
      data: [archivedChannelRow],
      error: null,
    });

    const result = await Effect.runPromise(
      listArchivedWorkspaceChannels(stub.client, workspaceId)
    );

    expect(result[0]?.archivedAt).toEqual(new Date('2026-08-08T14:00:00.000Z'));
    expect(stub.select).toHaveBeenCalledExactlyOnceWith(
      'channel_id, workspace_id, name, slug, description, updated_at'
    );
    expect(stub.eq).toHaveBeenNthCalledWith(1, 'workspace_id', workspaceId);
    expect(stub.eq).toHaveBeenNthCalledWith(2, 'channel_status', 'archived');
    expect(stub.order).toHaveBeenNthCalledWith(1, 'updated_at', {
      ascending: false,
    });
    expect(stub.order).toHaveBeenNthCalledWith(2, 'channel_id', {
      ascending: true,
    });
  });

  it('rejects an invalid archive timestamp', async () => {
    const stub = makeChannelListClientStub({
      data: [{ ...archivedChannelRow, updated_at: 'invalid' }],
      error: null,
    });

    const result = await Effect.runPromise(
      listArchivedWorkspaceChannels(stub.client, workspaceId).pipe(
        Effect.either
      )
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidChannelDataError');
    }
  });
});
