import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';

import { CurrentMessage } from '@chat-hub/shared/database';
import { findMessageById } from './find-message-by-id';
import {
  activeMessageRow,
  messageId,
  makeFindMessageClientStub,
  makeThrowingRpcClientStub,
} from '../testing';

describe('findMessageById', () => {
  it('returns a mapped domain message', async () => {
    const { client, from, select, eq, maybeSingle } = makeFindMessageClientStub(
      {
        data: activeMessageRow,
        error: null,
      }
    );

    const message = await Effect.runPromise(findMessageById(client, messageId));

    expect(message).toEqual({
      id: messageId,
      channelId: activeMessageRow.channel_id,
      authorId: activeMessageRow.author_user_id,
      status: 'active',
      content: 'Hello',
      createdAt: new Date('2026-07-26T18:00:00.000Z'),
      editedAt: null,
    });

    expect(from).toHaveBeenCalledWith('current_messages');

    expect(select).toHaveBeenCalledWith('*');

    expect(eq).toHaveBeenCalledWith('message_id', messageId);

    expect(maybeSingle).toHaveBeenCalledOnce();
  });

  it('fails when the message does not exist', async () => {
    const { client } = makeFindMessageClientStub({
      data: null,
      error: null,
    });

    const result = await Effect.runPromise(
      Effect.either(findMessageById(client, messageId))
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: {
        _tag: 'MessageNotFoundError',
      },
    });
  });

  it('maps permission errors', async () => {
    const { client } = makeFindMessageClientStub({
      data: null,
      error: {
        code: '42501',
        message: 'permission denied for current_messages',
        details: '',
        hint: '',
      },
    });

    const result = await Effect.runPromise(
      Effect.either(findMessageById(client, messageId))
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: {
        _tag: 'MessageAccessDeniedError',
      },
    });
  });

  it('maps malformed persisted rows', async () => {
    const invalidRow: CurrentMessage = {
      ...activeMessageRow,
      channel_id: null,
    };

    const { client } = makeFindMessageClientStub({
      data: invalidRow,
      error: null,
    });

    const result = await Effect.runPromise(
      Effect.either(findMessageById(client, messageId))
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: {
        _tag: 'InvalidMessageDataError',
      },
    });
  });

  it('maps thrown request failures', async () => {
    const client = makeThrowingRpcClientStub(new TypeError('Failed to fetch'));

    const result = await Effect.runPromise(
      Effect.either(findMessageById(client, messageId))
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: {
        _tag: 'MessageRepositoryUnavailableError',
      },
    });
  });
});
