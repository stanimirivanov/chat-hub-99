import { Effect, Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { ChannelIdSchema } from '@chat-hub/domain/channel';
import { makeChannelCommandClientStub } from '../testing';
import { archiveChannel } from './archive-channel';

const channelId = Schema.decodeUnknownSync(ChannelIdSchema)(
  '00000000-0000-4000-8000-000000000001'
);

describe('archiveChannel', () => {
  it('executes the RPC and acknowledges its void success', async () => {
    const stub = makeChannelCommandClientStub({
      data: undefined,
      error: null,
    });

    const result = await Effect.runPromise(
      archiveChannel(stub.client, channelId)
    );

    expect(stub.rpc).toHaveBeenCalledExactlyOnceWith('archive_channel', {
      p_channel_id: channelId,
    });
    expect(result).toBeUndefined();
  });

  it.each([
    [
      'authentication or owner authorization',
      {
        code: '42501',
        message: 'Only active workspace owners may archive channels',
      },
    ],
    [
      'missing or archived channel',
      {
        code: '55000',
        message: `Channel ${channelId} does not exist or is already archived`,
      },
    ],
    [
      'archived workspace',
      {
        code: '55000',
        message: 'Workspace 00000000-0000-4000-8000-000000000002 is archived',
      },
    ],
  ])('maps %s to archive-not-allowed', async (_label, error) => {
    const stub = makeChannelCommandClientStub({ data: null, error });

    const result = await Effect.runPromise(
      archiveChannel(stub.client, channelId).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'ChannelArchiveNotAllowedError',
        channelId,
      });
    }
  });

  it('does not misclassify an unrelated provider failure', async () => {
    const stub = makeChannelCommandClientStub({
      data: null,
      error: { code: '55000', message: 'A different archive failure' },
    });

    const result = await Effect.runPromise(
      archiveChannel(stub.client, channelId).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('ChannelRepositoryUnavailableError');
    }
  });
});
