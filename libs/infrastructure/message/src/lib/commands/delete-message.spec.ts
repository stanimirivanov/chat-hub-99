import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { deleteMessage } from './delete-message';
import { deleteMessageCommand, messageId } from '../testing/message-fixtures';
import {
  makeRpcClientStub,
  makeThrowingRpcClientStub,
} from '../testing/supabase-message-client.stub';

describe('deleteMessage', () => {
  it('calls delete_message and returns void', async () => {
    const { client, rpc } = makeRpcClientStub({
      data: null,
      error: null,
    });

    const result = await Effect.runPromise(
      deleteMessage(client, deleteMessageCommand)
    );

    expect(result).toBeUndefined();

    expect(rpc).toHaveBeenCalledExactlyOnceWith('delete_message', {
      p_message_id: deleteMessageCommand.messageId,
    });
  });

  it('maps a missing message to MessageNotFoundError', async () => {
    const { client } = makeRpcClientStub({
      data: null,
      error: {
        code: 'P0002',
        message: `Message ${messageId} does not exist`,
        details: '',
        hint: '',
      },
    });

    const result = await Effect.runPromise(
      Effect.either(deleteMessage(client, deleteMessageCommand))
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: {
        _tag: 'MessageNotFoundError',
        messageId,
      },
    });
  });

  it('maps delete permission failures to MessageAccessDeniedError', async () => {
    const { client } = makeRpcClientStub({
      data: null,
      error: {
        code: '42501',
        message:
          'Only the original author or an active workspace owner may delete this message',
        details: '',
        hint: '',
      },
    });

    const result = await Effect.runPromise(
      Effect.either(deleteMessage(client, deleteMessageCommand))
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: {
        _tag: 'MessageAccessDeniedError',
        operation: 'delete',
      },
    });
  });

  it('maps an already-deleted message to the current fallback error', async () => {
    const error = {
      code: '55000',
      message: `Message ${messageId} is already deleted`,
      details: '',
      hint: '',
    };

    const { client } = makeRpcClientStub({
      data: null,
      error,
    });

    const result = await Effect.runPromise(
      Effect.either(deleteMessage(client, deleteMessageCommand))
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: {
        _tag: 'MessageRepositoryUnavailableError',
        operation: 'delete',
        cause: error,
      },
    });
  });

  it('maps thrown delete failures to MessageRepositoryUnavailableError', async () => {
    const error = new TypeError('Failed to fetch');

    const client = makeThrowingRpcClientStub(error);

    const result = await Effect.runPromise(
      Effect.either(deleteMessage(client, deleteMessageCommand))
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: {
        _tag: 'MessageRepositoryUnavailableError',
        operation: 'delete',
        cause: error,
      },
    });
  });
});
