import { Effect, Schema } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import {
  ChannelIdSchema,
  CreateMessageCommandSchema,
  MessageIdSchema,
} from '@chat-hub/domain/message';
import type { CurrentMessage } from '@chat-hub/shared/database';
import type { ChatHubSupabaseClient } from './supabase-message-client';
import {
  createMessage,
  deleteMessage,
  editMessage,
  findMessageById,
  listMessagesByChannel,
} from './supabase-message-repository';
import { EditMessageCommandSchema } from '@chat-hub/domain/message';
import { DeleteMessageCommandSchema } from '@chat-hub/domain/message';
import {
  MessagePageSizeSchema,
  type ListChannelMessagesQuery,
} from '@chat-hub/application/message';

const messageId = Schema.decodeUnknownSync(MessageIdSchema)(
  '00000000-0000-4000-8000-000000000030'
);

const activeRow: CurrentMessage = {
  author_user_id: '00000000-0000-4000-8000-000000000010',
  channel_id: '00000000-0000-4000-8000-000000000020',
  content: 'Hello',
  created_at: '2026-07-26T18:00:00.000Z',
  deleted_at: null,
  deleted_by: null,
  is_edited: false,
  message_id: '00000000-0000-4000-8000-000000000030',
  message_status: 'active',
  message_version_id: '00000000-0000-4000-8000-000000000040',
  updated_at: '2026-07-26T18:00:00.000Z',
  version_created_at: '2026-07-26T18:00:00.000Z',
  version_created_by: '00000000-0000-4000-8000-000000000010',
  version_number: 1,
  workspace_id: '00000000-0000-4000-8000-000000000050',
};

describe('findMessageById', () => {
  it('returns a mapped domain message', async () => {
    const { client, from, select, eq, maybeSingle } = makeClientStub({
      data: activeRow,
      error: null,
    });

    const message = await Effect.runPromise(findMessageById(client, messageId));

    expect(message).toEqual({
      id: messageId,
      channelId: activeRow.channel_id,
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
    const { client } = makeClientStub({
      data: null,
      error: null,
    });

    const result = await Effect.runPromise(
      Effect.either(findMessageById(client, messageId))
    );

    expect(result._tag).toBe('Left');

    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('MessageNotFoundError');

      if (result.left._tag === 'MessageNotFoundError') {
        expect(result.left.messageId).toBe(messageId);
      }
    }
  });

  it('maps permission errors', async () => {
    const { client } = makeClientStub({
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

    expect(result._tag).toBe('Left');

    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('MessageAccessDeniedError');
    }
  });

  it('maps malformed persisted rows', async () => {
    const invalidRow: CurrentMessage = {
      ...activeRow,
      channel_id: null,
    };

    const { client } = makeClientStub({
      data: invalidRow,
      error: null,
    });

    const result = await Effect.runPromise(
      Effect.either(findMessageById(client, messageId))
    );

    expect(result._tag).toBe('Left');

    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('InvalidMessageDataError');
    }
  });

  it('maps thrown request failures', async () => {
    const client = makeThrowingClientStub(new TypeError('Failed to fetch'));

    const result = await Effect.runPromise(
      Effect.either(findMessageById(client, messageId))
    );

    expect(result._tag).toBe('Left');

    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('MessageRepositoryUnavailableError');
    }
  });
});

interface StubResponse {
  readonly data: CurrentMessage | null;

  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details: string;
    readonly hint: string;
  } | null;
}

const makeClientStub = (response: StubResponse) => {
  const maybeSingle = vi.fn().mockResolvedValue(response);

  const eq = vi.fn(() => ({
    maybeSingle,
  }));

  const select = vi.fn(() => ({
    eq,
  }));

  const from = vi.fn(() => ({
    select,
  }));

  const client = {
    from,
  } as unknown as ChatHubSupabaseClient;

  return {
    client,
    from,
    select,
    eq,
    maybeSingle,
  };
};

const makeThrowingClientStub = (cause: unknown): ChatHubSupabaseClient => {
  const maybeSingle = vi.fn().mockRejectedValue(cause);

  const eq = vi.fn(() => ({
    maybeSingle,
  }));

  const select = vi.fn(() => ({
    eq,
  }));

  const from = vi.fn(() => ({
    select,
  }));

  return {
    from,
  } as unknown as ChatHubSupabaseClient;
};

const createCommand = Schema.decodeUnknownSync(CreateMessageCommandSchema)({
  channelId: '00000000-0000-4000-8000-000000000020',
  content: 'Hello from the repository',
});

const createdMessageId = Schema.decodeUnknownSync(MessageIdSchema)(
  '00000000-0000-4000-8000-000000000030'
);

describe('createMessage', () => {
  it('calls create_message and returns the validated message ID', async () => {
    const { client, rpc } = makeRpcClientStub({
      data: createdMessageId,
      error: null,
    });

    const result = await Effect.runPromise(
      createMessage(client, createCommand)
    );

    expect(result).toBe(createdMessageId);

    expect(rpc).toHaveBeenCalledOnce();

    expect(rpc).toHaveBeenCalledWith('create_message', {
      p_channel_id: createCommand.channelId,
      p_content: createCommand.content,
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
      Effect.either(createMessage(client, createCommand))
    );

    expect(result._tag).toBe('Left');

    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('MessageAccessDeniedError');

      if (result.left._tag === 'MessageAccessDeniedError') {
        expect(result.left.operation).toBe('create');
      }
    }
  });

  it('rejects an invalid message ID returned by the RPC', async () => {
    const { client } = makeRpcClientStub({
      data: 'not-a-message-id',
      error: null,
    });

    const result = await Effect.runPromise(
      Effect.either(createMessage(client, createCommand))
    );

    expect(result._tag).toBe('Left');

    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('InvalidMessageDataError');
    }
  });

  it('rejects a null message ID returned by the RPC', async () => {
    const { client } = makeRpcClientStub({
      data: null,
      error: null,
    });

    const result = await Effect.runPromise(
      Effect.either(createMessage(client, createCommand))
    );

    expect(result._tag).toBe('Left');

    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('InvalidMessageDataError');
    }
  });

  it('maps thrown request failures to MessageRepositoryUnavailableError', async () => {
    const client = makeThrowingRpcClientStub(new TypeError('Failed to fetch'));

    const result = await Effect.runPromise(
      Effect.either(createMessage(client, createCommand))
    );

    expect(result._tag).toBe('Left');

    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('MessageRepositoryUnavailableError');

      if (result.left._tag === 'MessageRepositoryUnavailableError') {
        expect(result.left.operation).toBe('create');
      }
    }
  });
});

interface RpcStubResponse<TData> {
  readonly data: TData;

  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details: string;
    readonly hint: string;
  } | null;
}

const makeRpcClientStub = <TData>(response: RpcStubResponse<TData>) => {
  const rpc = vi.fn().mockResolvedValue(response);

  const client = {
    rpc,
  } as unknown as ChatHubSupabaseClient;

  return {
    client,
    rpc,
  };
};

const makeThrowingRpcClientStub = (cause: unknown): ChatHubSupabaseClient => {
  const rpc = vi.fn().mockRejectedValue(cause);

  return {
    rpc,
  } as unknown as ChatHubSupabaseClient;
};

const editCommand = Schema.decodeUnknownSync(EditMessageCommandSchema)({
  messageId,
  content: 'Edited message content',
});

const messageVersionId = '00000000-0000-4000-8000-000000000040';

describe('editMessage', () => {
  it('calls edit_message and returns void', async () => {
    const { client, rpc } = makeRpcClientStub({
      data: messageVersionId,
      error: null,
    });

    const result = await Effect.runPromise(editMessage(client, editCommand));

    expect(result).toBeUndefined();

    expect(rpc).toHaveBeenCalledOnce();

    expect(rpc).toHaveBeenCalledWith('edit_message', {
      p_message_id: editCommand.messageId,
      p_content: editCommand.content,
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
      Effect.either(editMessage(client, editCommand))
    );

    expect(result._tag).toBe('Left');

    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('MessageNotFoundError');

      if (result.left._tag === 'MessageNotFoundError') {
        expect(result.left.messageId).toBe(messageId);
      }
    }
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
      Effect.either(editMessage(client, editCommand))
    );

    expect(result._tag).toBe('Left');

    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('MessageAccessDeniedError');

      if (result.left._tag === 'MessageAccessDeniedError') {
        expect(result.left.operation).toBe('edit');
      }
    }
  });

  it('rejects an invalid message-version ID returned by the RPC', async () => {
    const { client } = makeRpcClientStub({
      data: 'not-a-uuid',
      error: null,
    });

    const result = await Effect.runPromise(
      Effect.either(editMessage(client, editCommand))
    );

    expect(result._tag).toBe('Left');

    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('InvalidMessageDataError');
    }
  });

  it('rejects a null message-version ID returned by the RPC', async () => {
    const { client } = makeRpcClientStub({
      data: null,
      error: null,
    });

    const result = await Effect.runPromise(
      Effect.either(editMessage(client, editCommand))
    );

    expect(result._tag).toBe('Left');

    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('InvalidMessageDataError');
    }
  });

  it('maps thrown edit failures to MessageRepositoryUnavailableError', async () => {
    const client = makeThrowingRpcClientStub(new TypeError('Failed to fetch'));

    const result = await Effect.runPromise(
      Effect.either(editMessage(client, editCommand))
    );

    expect(result._tag).toBe('Left');

    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('MessageRepositoryUnavailableError');

      if (result.left._tag === 'MessageRepositoryUnavailableError') {
        expect(result.left.operation).toBe('edit');
      }
    }
  });

  it('maps an unchanged-content rejection to the current fallback error', async () => {
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
      Effect.either(editMessage(client, editCommand))
    );

    expect(result._tag).toBe('Left');

    if (
      result._tag === 'Left' &&
      result.left._tag === 'MessageRepositoryUnavailableError'
    ) {
      expect(result.left.operation).toBe('edit');

      expect(result.left.cause).toBe(error);
    }
  });
});

const deleteCommand = Schema.decodeUnknownSync(DeleteMessageCommandSchema)({
  messageId,
});

describe('deleteMessage', () => {
  it('calls delete_message and returns void', async () => {
    const { client, rpc } = makeRpcClientStub({
      data: null,
      error: null,
    });

    const result = await Effect.runPromise(
      deleteMessage(client, deleteCommand)
    );

    expect(result).toBeUndefined();

    expect(rpc).toHaveBeenCalledOnce();

    expect(rpc).toHaveBeenCalledWith('delete_message', {
      p_message_id: deleteCommand.messageId,
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
      Effect.either(deleteMessage(client, deleteCommand))
    );

    expect(result._tag).toBe('Left');

    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('MessageNotFoundError');

      if (result.left._tag === 'MessageNotFoundError') {
        expect(result.left.messageId).toBe(messageId);
      }
    }
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
      Effect.either(deleteMessage(client, deleteCommand))
    );

    expect(result._tag).toBe('Left');

    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('MessageAccessDeniedError');

      if (result.left._tag === 'MessageAccessDeniedError') {
        expect(result.left.operation).toBe('delete');
      }
    }
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
      Effect.either(deleteMessage(client, deleteCommand))
    );

    expect(result._tag).toBe('Left');

    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('MessageRepositoryUnavailableError');

      if (result.left._tag === 'MessageRepositoryUnavailableError') {
        expect(result.left.operation).toBe('delete');

        expect(result.left.cause).toBe(error);
      }
    }
  });

  it('maps thrown delete failures to MessageRepositoryUnavailableError', async () => {
    const cause = new TypeError('Failed to fetch');

    const client = makeThrowingRpcClientStub(cause);

    const result = await Effect.runPromise(
      Effect.either(deleteMessage(client, deleteCommand))
    );

    expect(result._tag).toBe('Left');

    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('MessageRepositoryUnavailableError');

      if (result.left._tag === 'MessageRepositoryUnavailableError') {
        expect(result.left.operation).toBe('delete');

        expect(result.left.cause).toBe(cause);
      }
    }
  });
});

const channelId = Schema.decodeUnknownSync(ChannelIdSchema)(
  '00000000-0000-4000-8000-000000000020'
);

const pageSize = Schema.decodeUnknownSync(MessagePageSizeSchema)(2);

const listQuery: ListChannelMessagesQuery = {
  channelId,
  limit: pageSize,
};

const newestRow: CurrentMessage = {
  ...activeRow,
  message_id: '00000000-0000-4000-8000-000000000033',
  content: 'Newest message',
  created_at: '2026-07-26T21:00:00.000Z',
  version_created_at: '2026-07-26T21:00:00.000Z',
  updated_at: '2026-07-26T21:00:00.000Z',
};

const middleRow: CurrentMessage = {
  ...activeRow,
  message_id: '00000000-0000-4000-8000-000000000032',
  content: 'Middle message',
  created_at: '2026-07-26T20:00:00.000Z',
  version_created_at: '2026-07-26T20:00:00.000Z',
  updated_at: '2026-07-26T20:00:00.000Z',
};

const oldestRow: CurrentMessage = {
  ...activeRow,
  message_id: '00000000-0000-4000-8000-000000000031',
  content: 'Oldest message',
  created_at: '2026-07-26T19:00:00.000Z',
  version_created_at: '2026-07-26T19:00:00.000Z',
  updated_at: '2026-07-26T19:00:00.000Z',
};

interface ListStubResponse {
  readonly data: readonly CurrentMessage[] | null;

  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details: string;
    readonly hint: string;
  } | null;
}

const makeListClientStub = (response: ListStubResponse) => {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    or: vi.fn(),
    then: vi.fn(),
  };

  builder.select.mockReturnValue(builder);

  builder.eq.mockReturnValue(builder);

  builder.order.mockReturnValue(builder);

  builder.limit.mockReturnValue(builder);

  builder.or.mockReturnValue(builder);

  builder.then.mockImplementation(
    (
      resolve: (value: ListStubResponse) => unknown,
      reject?: (cause: unknown) => unknown
    ) => Promise.resolve(response).then(resolve, reject)
  );

  const from = vi.fn(() => builder);

  const client = {
    from,
  } as unknown as ChatHubSupabaseClient;

  return {
    client,
    from,
    select: builder.select,
    eq: builder.eq,
    order: builder.order,
    limit: builder.limit,
    or: builder.or,
  };
};

const makeThrowingListClientStub = (cause: unknown): ChatHubSupabaseClient => {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    or: vi.fn(),
    then: vi.fn(),
  };

  builder.select.mockReturnValue(builder);

  builder.eq.mockReturnValue(builder);

  builder.order.mockReturnValue(builder);

  builder.limit.mockReturnValue(builder);

  builder.or.mockReturnValue(builder);

  builder.then.mockImplementation(
    (_resolve: unknown, reject: (value: unknown) => unknown) =>
      Promise.reject(cause).then(undefined, reject)
  );

  return {
    from: vi.fn(() => builder),
  } as unknown as ChatHubSupabaseClient;
};

describe('listMessagesByChannel', () => {
  it('returns a page without a cursor when no more rows exist', async () => {
    const { client, from, select, eq, order, limit, or } = makeListClientStub({
      data: [newestRow, middleRow],
      error: null,
    });

    const result = await Effect.runPromise(
      listMessagesByChannel(client, listQuery)
    );

    expect(result.messages).toHaveLength(2);

    expect(result.messages.map((message) => message.content)).toEqual([
      'Newest message',
      'Middle message',
    ]);

    expect(result.nextCursor).toBeNull();

    expect(from).toHaveBeenCalledWith('current_messages');

    expect(select).toHaveBeenCalledWith('*');

    expect(eq).toHaveBeenCalledWith('channel_id', channelId);

    expect(order).toHaveBeenNthCalledWith(1, 'created_at', {
      ascending: false,
    });

    expect(order).toHaveBeenNthCalledWith(2, 'message_id', {
      ascending: false,
    });

    expect(limit).toHaveBeenCalledWith(3);

    expect(or).not.toHaveBeenCalled();
  });

  it('returns a continuation cursor when an extra row exists', async () => {
    const { client } = makeListClientStub({
      data: [newestRow, middleRow, oldestRow],
      error: null,
    });

    const result = await Effect.runPromise(
      listMessagesByChannel(client, listQuery)
    );

    expect(result.messages).toHaveLength(2);

    expect(result.messages.map((message) => message.id)).toEqual([
      newestRow.message_id,
      middleRow.message_id,
    ]);

    expect(result.nextCursor).toEqual({
      createdAt: new Date(middleRow.created_at as string),
      messageId: middleRow.message_id,
    });
  });

  it('returns a continuation cursor when an extra row exists', async () => {
    const { client } = makeListClientStub({
      data: [newestRow, middleRow, oldestRow],
      error: null,
    });

    const result = await Effect.runPromise(
      listMessagesByChannel(client, listQuery)
    );

    expect(result.messages).toHaveLength(2);

    expect(result.messages.map((message) => message.id)).toEqual([
      newestRow.message_id,
      middleRow.message_id,
    ]);

    expect(result.nextCursor).toEqual({
      createdAt: new Date(middleRow.created_at as string),
      messageId: middleRow.message_id,
    });
  });

  it('returns an empty terminal page', async () => {
    const { client } = makeListClientStub({
      data: [],
      error: null,
    });

    const result = await Effect.runPromise(
      listMessagesByChannel(client, listQuery)
    );

    expect(result).toEqual({
      messages: [],
      nextCursor: null,
    });
  });

  it('fails when one returned row is invalid', async () => {
    const invalidRow: CurrentMessage = {
      ...middleRow,
      created_at: 'not-a-date',
    };

    const { client } = makeListClientStub({
      data: [newestRow, invalidRow],
      error: null,
    });

    const result = await Effect.runPromise(
      Effect.either(listMessagesByChannel(client, listQuery))
    );

    expect(result._tag).toBe('Left');

    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('InvalidMessageDataError');
    }
  });

  it('maps a read permission failure', async () => {
    const { client } = makeListClientStub({
      data: null,
      error: {
        code: '42501',
        message: 'permission denied for current_messages',
        details: '',
        hint: '',
      },
    });

    const result = await Effect.runPromise(
      Effect.either(listMessagesByChannel(client, listQuery))
    );

    expect(result._tag).toBe('Left');

    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('MessageAccessDeniedError');

      if (result.left._tag === 'MessageAccessDeniedError') {
        expect(result.left.operation).toBe('read');
      }
    }
  });

  it('maps thrown list failures to repository unavailable', async () => {
    const cause = new TypeError('Failed to fetch');

    const client = makeThrowingListClientStub(cause);

    const result = await Effect.runPromise(
      Effect.either(listMessagesByChannel(client, listQuery))
    );

    expect(result._tag).toBe('Left');

    if (
      result._tag === 'Left' &&
      result.left._tag === 'MessageRepositoryUnavailableError'
    ) {
      expect(result.left.operation).toBe('read');

      expect(result.left.cause).toBe(cause);
    }
  });
});
