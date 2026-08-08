import { Effect, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  MessageRevisionPageSizeSchema,
  type ListMessageRevisionsQuery,
} from '@omoikane/application/message';
import { MessageRevisionNumberSchema } from '@omoikane/domain/message';
import {
  makeListMessageRevisionsClientStub,
  messageId,
  messageRevisionRow,
} from '../testing';
import { listMessageRevisions } from './list-message-revisions';

const makeQuery = (
  overrides: Partial<ListMessageRevisionsQuery> = {}
): ListMessageRevisionsQuery => ({
  messageId,
  limit: Schema.decodeUnknownSync(MessageRevisionPageSizeSchema)(20),
  ...overrides,
});

describe('listMessageRevisions', () => {
  it('queries newest revisions and requests one look-ahead row', async () => {
    const { client, from, select, eq, order, limit } =
      makeListMessageRevisionsClientStub({
        data: [messageRevisionRow],
        error: null,
      });

    const result = await Effect.runPromise(
      listMessageRevisions(client, makeQuery())
    );

    expect(result.revisions).toHaveLength(1);
    expect(from).toHaveBeenCalledExactlyOnceWith('message_versions');
    expect(select).toHaveBeenCalledExactlyOnceWith(
      'message_version_id, message_id, version_number, content, created_by, created_at'
    );
    expect(eq).toHaveBeenCalledExactlyOnceWith('message_id', messageId);
    expect(order).toHaveBeenCalledExactlyOnceWith('version_number', {
      ascending: false,
    });
    expect(limit).toHaveBeenCalledExactlyOnceWith(21);
  });

  it('filters rows strictly below the cursor version', async () => {
    const { client, lt } = makeListMessageRevisionsClientStub({
      data: [],
      error: null,
    });
    const versionNumber = Schema.decodeUnknownSync(MessageRevisionNumberSchema)(
      2
    );

    await Effect.runPromise(
      listMessageRevisions(client, makeQuery({ before: { versionNumber } }))
    );

    expect(lt).toHaveBeenCalledExactlyOnceWith('version_number', 2);
  });

  it('returns a next cursor when a look-ahead row exists', async () => {
    const olderRow = {
      ...messageRevisionRow,
      message_version_id: '00000000-0000-4000-8000-000000000041',
      version_number: 1,
    };
    const { client } = makeListMessageRevisionsClientStub({
      data: [messageRevisionRow, olderRow],
      error: null,
    });

    const result = await Effect.runPromise(
      listMessageRevisions(
        client,
        makeQuery({
          limit: Schema.decodeUnknownSync(MessageRevisionPageSizeSchema)(1),
        })
      )
    );

    expect(result.revisions).toHaveLength(1);
    expect(result.nextCursor).toEqual({ versionNumber: 2 });
  });

  it('maps provider errors', async () => {
    const { client } = makeListMessageRevisionsClientStub({
      data: null,
      error: {
        code: '42501',
        message: 'permission denied',
        details: '',
        hint: '',
      },
    });

    const result = await Effect.runPromise(
      Effect.either(listMessageRevisions(client, makeQuery()))
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: { _tag: 'MessageAccessDeniedError', operation: 'read' },
    });
  });

  it('maps malformed rows', async () => {
    const { client } = makeListMessageRevisionsClientStub({
      data: [{ ...messageRevisionRow, content: '   ' }],
      error: null,
    });

    const result = await Effect.runPromise(
      Effect.either(listMessageRevisions(client, makeQuery()))
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: { _tag: 'InvalidMessageDataError' },
    });
  });
});
