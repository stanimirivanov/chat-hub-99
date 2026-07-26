import { Effect, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { MessageIdSchema } from './message-id';

describe('MessageId', () => {
  const decode = Schema.decodeUnknown(MessageIdSchema);

  it('accepts a UUID', async () => {
    const id = '00000000-0000-4000-8000-000000000000';

    const result = await Effect.runPromise(decode(id));

    expect(result).toBe(id);
  });

  it('rejects an invalid UUID', async () => {
    await expect(Effect.runPromise(decode('not-a-uuid'))).rejects.toBeDefined();
  });
});
