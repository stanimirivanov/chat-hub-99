import { Effect, Schema } from 'effect';
import { describe, expect, it } from 'vitest';

import {
  ListChannelMessagesQuery,
  MessagePageSizeSchema,
} from '@omoikane/application/message';
import type { CurrentMessage } from '@omoikane/shared/database';
import {
  listMessagesByChannel,
  toBeforeCursorFilter,
} from './list-messages-by-channel';
import {
  activeMessageRow,
  channelId,
  makeListMessageClientStub,
  messageId,
} from '../testing';

const makeQuery = (
  overrides: Partial<ListChannelMessagesQuery> = {}
): ListChannelMessagesQuery => ({
  channelId,
  limit: Schema.decodeUnknownSync(MessagePageSizeSchema)(20),
  ...overrides,
});

describe('listMessagesByChannel', () => {
  it('queries current messages in stable descending order', async () => {
    const {
      client,
      from,
      select,
      eq,
      orderByCreatedAt,
      orderByMessageId,
      limit,
    } = makeListMessageClientStub({
      data: [activeMessageRow],
      error: null,
    });

    const result = await Effect.runPromise(
      listMessagesByChannel(client, makeQuery())
    );

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({
      id: messageId,
      channelId,
      status: 'active',
      content: activeMessageRow.content,
    });

    expect(from).toHaveBeenCalledExactlyOnceWith('current_messages');
    expect(select).toHaveBeenCalledExactlyOnceWith('*');
    expect(eq).toHaveBeenCalledExactlyOnceWith('channel_id', channelId);

    expect(orderByCreatedAt).toHaveBeenCalledExactlyOnceWith('created_at', {
      ascending: false,
    });

    expect(orderByMessageId).toHaveBeenCalledExactlyOnceWith('message_id', {
      ascending: false,
    });

    // One additional row is requested to detect whether another page exists.
    expect(limit).toHaveBeenCalledExactlyOnceWith(21);
  });

  it('applies a compound before-cursor filter', async () => {
    const { client, or } = makeListMessageClientStub({
      data: [],
      error: null,
    });

    const before = {
      createdAt: new Date('2026-07-26T18:00:00.000Z'),
      messageId,
    };

    await Effect.runPromise(
      listMessagesByChannel(client, makeQuery({ before }))
    );

    expect(or).toHaveBeenCalledExactlyOnceWith(toBeforeCursorFilter(before));
  });

  it('returns a next cursor when a look-ahead row exists', async () => {
    const secondRow: CurrentMessage = {
      ...activeMessageRow,
      message_id: '00000000-0000-4000-8000-000000000031',
      created_at: '2026-07-26T17:00:00.000Z',
      updated_at: '2026-07-26T17:00:00.000Z',
      version_created_at: '2026-07-26T17:00:00.000Z',
    };

    const lookAheadRow: CurrentMessage = {
      ...activeMessageRow,
      message_id: '00000000-0000-4000-8000-000000000032',
      created_at: '2026-07-26T16:00:00.000Z',
      updated_at: '2026-07-26T16:00:00.000Z',
      version_created_at: '2026-07-26T16:00:00.000Z',
    };

    const { client } = makeListMessageClientStub({
      data: [activeMessageRow, secondRow, lookAheadRow],
      error: null,
    });

    const result = await Effect.runPromise(
      listMessagesByChannel(
        client,
        makeQuery({
          limit: Schema.decodeUnknownSync(MessagePageSizeSchema)(2),
        })
      )
    );

    expect(result.messages).toHaveLength(2);

    const lastReturnedMessage = result.messages[1];
    expect(result.nextCursor).toEqual({
      createdAt: lastReturnedMessage.createdAt,
      messageId: lastReturnedMessage.id,
    });
  });

  it('returns no next cursor when there is no look-ahead row', async () => {
    const { client } = makeListMessageClientStub({
      data: [activeMessageRow],
      error: null,
    });

    const result = await Effect.runPromise(
      listMessagesByChannel(client, makeQuery())
    );

    expect(result.nextCursor).toBeNull();
  });

  it('maps PostgREST permission errors', async () => {
    const { client } = makeListMessageClientStub({
      data: null,
      error: {
        code: '42501',
        message: 'permission denied for current_messages',
        details: '',
        hint: '',
      },
    });

    const result = await Effect.runPromise(
      Effect.either(listMessagesByChannel(client, makeQuery()))
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: {
        _tag: 'MessageAccessDeniedError',
        operation: 'read',
      },
    });
  });

  it('maps malformed persisted rows', async () => {
    const invalidRow: CurrentMessage = {
      ...activeMessageRow,
      channel_id: null,
    };

    const { client } = makeListMessageClientStub({
      data: [invalidRow],
      error: null,
    });

    const result = await Effect.runPromise(
      Effect.either(listMessagesByChannel(client, makeQuery()))
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: {
        _tag: 'InvalidMessageDataError',
      },
    });
  });
});
