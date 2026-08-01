import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { editMessage } from './edit-message';
import {
  editMessageCommand,
  messageId,
  makeRpcClientStub,
  makeThrowingRpcClientStub,
} from '../testing';

describe('editMessage', () => {
  it('calls edit_message and returns void', async () => {
    const { client, rpc } = makeRpcClientStub({
      data: messageId,
      error: null,
    });

    const result = await Effect.runPromise(
      editMessage(client, editMessageCommand)
    );

    expect(result).toBeUndefined();

    expect(rpc).toHaveBeenCalledExactlyOnceWith('edit_message', {
      p_message_id: editMessageCommand.messageId,
      p_content: editMessageCommand.content,
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
      Effect.either(editMessage(client, editMessageCommand))
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: {
        _tag: 'MessageNotFoundError',
        messageId,
      },
    });
  });

  it('maps author permission failures to MessageAccessDeniedError', async () => {
    const { client } = makeRpcClientStub({
      data: null,
      error: {
        code: '42501',
        message: 'Only the original message author may edit this message',
        details: '',
        hint: '',
      },
    });

    const result = await Effect.runPromise(
      Effect.either(editMessage(client, editMessageCommand))
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: {
        _tag: 'MessageAccessDeniedError',
        operation: 'edit',
      },
    });
  });

  it.each([null, 'not-a-uuid'])(
    'rejects an invalid RPC result: %j',
    async (data) => {
      const { client } = makeRpcClientStub({
        data,
        error: null,
      });

      const result = await Effect.runPromise(
        Effect.either(editMessage(client, editMessageCommand))
      );

      expect(result).toMatchObject({
        _tag: 'Left',
        left: {
          _tag: 'InvalidMessageDataError',
        },
      });
    }
  );

  it('maps thrown edit failures to MessageRepositoryUnavailableError', async () => {
    const client = makeThrowingRpcClientStub(new TypeError('Failed to fetch'));

    const result = await Effect.runPromise(
      Effect.either(editMessage(client, editMessageCommand))
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: {
        _tag: 'MessageRepositoryUnavailableError',
        operation: 'edit',
      },
    });
  });

  it('maps the database no-op rejection to MessageContentUnchangedError', async () => {
    const error = {
      code: '22023',
      message: 'Edited message content must differ from the current content',
      details: '',
      hint: '',
    };

    const { client } = makeRpcClientStub({
      data: null,
      error,
    });

    const result = await Effect.runPromise(
      Effect.either(editMessage(client, editMessageCommand))
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: {
        _tag: 'MessageContentUnchangedError',
        messageId,
      },
    });
  });

  it('does not misclassify another invalid-parameter failure', async () => {
    const error = {
      code: '22023',
      message: 'Another edit parameter is invalid',
      details: '',
      hint: '',
    };
    const { client } = makeRpcClientStub({
      data: null,
      error,
    });

    const result = await Effect.runPromise(
      Effect.either(editMessage(client, editMessageCommand))
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: {
        _tag: 'MessageRepositoryUnavailableError',
        operation: 'edit',
        cause: error,
      },
    });
  });
});
