import { Effect, Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { ChannelIdSchema } from '@omoikane/domain/channel';
import { currentChannelRow, makeChannelCommandClientStub } from '../testing';
import { restoreChannel } from './restore-channel';

const channelId = Schema.decodeUnknownSync(ChannelIdSchema)(
  currentChannelRow.channel_id
);

describe('restoreChannel', () => {
  it('executes the RPC and maps its active result', async () => {
    const stub = makeChannelCommandClientStub({
      data: currentChannelRow,
      error: null,
    });

    const result = await Effect.runPromise(
      restoreChannel(stub.client, channelId)
    );

    expect(result).toEqual({
      id: channelId,
      workspaceId: currentChannelRow.workspace_id,
      name: currentChannelRow.name,
      slug: currentChannelRow.slug,
      description: currentChannelRow.description,
    });
    expect(stub.rpc).toHaveBeenCalledExactlyOnceWith('restore_channel', {
      p_channel_id: channelId,
    });
  });

  it.each([
    ['unauthorized', { code: '42501', message: 'Only owners may restore' }],
    [
      'not archived',
      {
        code: '55000',
        message: `Channel ${channelId} does not exist or is not archived`,
      },
    ],
    ['archived workspace', { code: '55000', message: 'Workspace is archived' }],
  ])('preserves %s as a restoration rejection', async (_label, error) => {
    const stub = makeChannelCommandClientStub({ data: null, error });

    const result = await Effect.runPromise(
      restoreChannel(stub.client, channelId).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'ChannelRestoreNotAllowedError',
        channelId,
      });
    }
  });

  it.each([
    ['missing result', null],
    [
      'wrong identity',
      {
        ...currentChannelRow,
        channel_id: '00000000-0000-4000-8000-000000000099',
      },
    ],
    ['archived result', { ...currentChannelRow, channel_status: 'archived' }],
  ])('rejects an invalid %s', async (_label, data) => {
    const stub = makeChannelCommandClientStub({ data, error: null });

    const result = await Effect.runPromise(
      restoreChannel(stub.client, channelId).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidChannelDataError');
    }
  });
});
