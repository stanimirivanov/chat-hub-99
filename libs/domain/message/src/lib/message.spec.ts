import { Effect, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { MessageSchema } from './message';

describe('MessageSchema', () => {
  const decode = Schema.decodeUnknown(MessageSchema);

  it('accepts an active message', async () => {
    const result = await Effect.runPromise(
      decode({
        id: '00000000-0000-4000-8000-000000000001',
        channelId: '00000000-0000-4000-8000-000000000002',
        status: 'active',
        content: 'Hello world',
        createdAt: new Date('2026-01-01T10:00:00Z'),
        editedAt: null,
      })
    );

    expect(result.status).toBe('active');
    expect(result.content).toBe('Hello world');
  });

  it('accepts a deleted message', async () => {
    const result = await Effect.runPromise(
      decode({
        id: '00000000-0000-4000-8000-000000000001',
        channelId: '00000000-0000-4000-8000-000000000002',
        status: 'deleted',
        content: null,
        createdAt: new Date('2026-01-01T10:00:00Z'),
        editedAt: new Date('2026-01-01T11:00:00Z'),
        deletedAt: new Date('2026-01-01T12:00:00Z'),
      })
    );

    expect(result.status).toBe('deleted');
    expect(result.content).toBeNull();
  });

  it('rejects an active message with null content', async () => {
    await expect(
      Effect.runPromise(
        decode({
          id: '00000000-0000-4000-8000-000000000001',
          channelId: '00000000-0000-4000-8000-000000000002',
          status: 'active',
          content: null,
          createdAt: new Date(),
          editedAt: null,
        })
      )
    ).rejects.toBeDefined();
  });

  it('rejects a deleted message with non-null content', async () => {
    await expect(
      Effect.runPromise(
        decode({
          id: '00000000-0000-4000-8000-000000000001',
          channelId: '00000000-0000-4000-8000-000000000002',
          status: 'deleted',
          content: 'Should not exist',
          createdAt: new Date(),
          editedAt: null,
          deletedAt: new Date(),
        })
      )
    ).rejects.toBeDefined();
  });

  it('rejects a deleted message without deletedAt', async () => {
    await expect(
      Effect.runPromise(
        decode({
          id: '00000000-0000-4000-8000-000000000001',
          channelId: '00000000-0000-4000-8000-000000000002',
          status: 'deleted',
          content: null,
          createdAt: new Date(),
          editedAt: null,
        })
      )
    ).rejects.toBeDefined();
  });
});
