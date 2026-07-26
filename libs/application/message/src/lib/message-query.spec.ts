import { Effect, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { MessagePageSizeSchema } from './message-query';

describe('MessagePageSizeSchema', () => {
  const decode = Schema.decodeUnknown(MessagePageSizeSchema);

  it('accepts a valid page size', async () => {
    const result = await Effect.runPromise(decode(50));

    expect(result).toBe(50);
  });

  it('rejects zero', async () => {
    await expect(Effect.runPromise(decode(0))).rejects.toBeDefined();
  });

  it('rejects a non-integer', async () => {
    await expect(Effect.runPromise(decode(10.5))).rejects.toBeDefined();
  });

  it('rejects values above the maximum', async () => {
    await expect(Effect.runPromise(decode(101))).rejects.toBeDefined();
  });
});
