import { Effect, Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import type { UpdateChannelCommand } from '@omoikane/application/channel';
import { ChannelIdSchema } from '@omoikane/domain/channel';
import {
  makeChannelCommandClientStub,
  updatedChannelVersionId,
} from '../testing';
import { updateChannel } from './update-channel';

const command: UpdateChannelCommand = {
  channelId: Schema.decodeUnknownSync(ChannelIdSchema)(
    '00000000-0000-4000-8000-000000000001'
  ),
  name: 'Product Design',
  description: null,
};

describe('updateChannel', () => {
  it('executes the RPC and validates its version acknowledgment', async () => {
    const stub = makeChannelCommandClientStub({
      data: updatedChannelVersionId,
      error: null,
    });

    const result = await Effect.runPromise(updateChannel(stub.client, command));

    expect(stub.rpc).toHaveBeenCalledExactlyOnceWith('update_channel', {
      p_channel_id: command.channelId,
      p_name: command.name,
    });
    expect(result).toBeUndefined();
  });

  it('includes a present description in the RPC arguments', async () => {
    const stub = makeChannelCommandClientStub({
      data: updatedChannelVersionId,
      error: null,
    });

    await Effect.runPromise(
      updateChannel(stub.client, {
        ...command,
        description: 'Design collaboration',
      })
    );

    expect(stub.rpc).toHaveBeenCalledExactlyOnceWith('update_channel', {
      p_channel_id: command.channelId,
      p_name: command.name,
      p_description: 'Design collaboration',
    });
  });

  it.each([
    [
      'authentication or owner authorization',
      {
        code: '42501',
        message: 'Only active workspace owners may update channels',
      },
    ],
    [
      'archived or missing channel',
      {
        code: '55000',
        message: `Channel ${command.channelId} does not exist or is archived`,
      },
    ],
    [
      'archived workspace',
      {
        code: '55000',
        message: 'Workspace 00000000-0000-4000-8000-000000000002 is archived',
      },
    ],
  ])('maps %s to update-not-allowed', async (_label, error) => {
    const stub = makeChannelCommandClientStub({ data: null, error });

    const result = await Effect.runPromise(
      updateChannel(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'ChannelUpdateNotAllowedError',
        channelId: command.channelId,
      });
    }
  });

  it('does not misclassify an unrelated provider failure', async () => {
    const stub = makeChannelCommandClientStub({
      data: null,
      error: { code: '55000', message: 'A different update failure' },
    });

    const result = await Effect.runPromise(
      updateChannel(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('ChannelRepositoryUnavailableError');
    }
  });

  it.each([
    ['missing result', null],
    ['invalid version identity', 'not-a-uuid'],
  ])('rejects an invalid %s', async (_label, data) => {
    const stub = makeChannelCommandClientStub({ data, error: null });

    const result = await Effect.runPromise(
      updateChannel(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidChannelDataError');
    }
  });
});
