import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { createMessage } from './create-message';
import {
  createMessageCommand,
  messageId,
  makeRpcClientStub,
  makeThrowingRpcClientStub,
} from '../testing';

describe('createMessage', () => {
  it('calls create_message and returns the validated message ID', async () => {
    const { client, rpc } = makeRpcClientStub({
      data: messageId,
      error: null,
    });

    const result = await Effect.runPromise(
      createMessage(client, createMessageCommand)
    );

    expect(result).toBe(messageId);

    expect(rpc).toHaveBeenCalledExactlyOnceWith('create_message', {
      p_channel_id: createMessageCommand.channelId,
      p_content: createMessageCommand.content,
    });
  });

  it('maps permission errors to MessageAccessDeniedError', async () => {
    const { client } = makeRpcClientStub({
      data: null,
      error: {
        code: '42501',
        message: 'Only active workspace members may create messages',
        details: '',
        hint: '',
      },
    });

    const result = await Effect.runPromise(
      Effect.either(createMessage(client, createMessageCommand))
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: {
        _tag: 'MessageAccessDeniedError',
        operation: 'create',
      },
    });
  });

  it.each([null, 'not-a-message-id'])(
    'rejects an invalid RPC result: %j',
    async (data) => {
      const { client } = makeRpcClientStub({
        data,
        error: null,
      });

      const result = await Effect.runPromise(
        Effect.either(createMessage(client, createMessageCommand))
      );

      expect(result).toMatchObject({
        _tag: 'Left',
        left: {
          _tag: 'InvalidMessageDataError',
        },
      });
    }
  );

  it('maps rejected requests to MessageRepositoryUnavailableError', async () => {
    const client = makeThrowingRpcClientStub(new TypeError('Failed to fetch'));

    const result = await Effect.runPromise(
      Effect.either(createMessage(client, createMessageCommand))
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: {
        _tag: 'MessageRepositoryUnavailableError',
        operation: 'create',
      },
    });
  });
});
