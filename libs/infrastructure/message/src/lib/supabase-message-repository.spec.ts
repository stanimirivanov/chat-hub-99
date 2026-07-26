import { Effect, Schema } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { MessageIdSchema } from '@chat-hub/domain/message';
import type { CurrentMessage } from '@chat-hub/shared/database';
import type { ChatHubSupabaseClient } from './supabase-message-client';
import { findMessageById } from './supabase-message-repository';

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
