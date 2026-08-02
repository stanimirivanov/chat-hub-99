import { Effect, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { MessageRevisionSchema } from './message-revision';

const decode = Schema.decodeUnknown(MessageRevisionSchema);

const validRevision = {
  id: '00000000-0000-4000-8000-000000000010',
  messageId: '00000000-0000-4000-8000-000000000020',
  versionNumber: 2,
  content: 'Updated content',
  createdBy: '00000000-0000-4000-8000-000000000030',
  createdAt: new Date('2026-08-01T08:00:00.000Z'),
};

describe('MessageRevisionSchema', () => {
  it('accepts a complete immutable revision', async () => {
    const result = await Effect.runPromise(decode(validRevision));

    expect(result).toMatchObject(validRevision);
  });

  it.each([
    ['invalid identity', { id: 'not-a-uuid' }],
    ['invalid message identity', { messageId: 'not-a-uuid' }],
    ['non-positive version', { versionNumber: 0 }],
    ['fractional version', { versionNumber: 1.5 }],
    ['blank content', { content: '   ' }],
    ['invalid creator identity', { createdBy: 'not-a-uuid' }],
    ['invalid timestamp', { createdAt: '2026-08-01' }],
  ])('rejects %s', async (_label, override) => {
    await expect(
      Effect.runPromise(decode({ ...validRevision, ...override }))
    ).rejects.toBeDefined();
  });
});
