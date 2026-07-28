import { Effect, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { MessagePageSizeSchema } from './message-page-size';

const decodePageSize = Schema.decodeUnknown(MessagePageSizeSchema);

describe('MessagePageSizeSchema', () => {
  it.each([1, 25, 50, 100])('accepts valid page size %s', async (value) => {
    await expect(Effect.runPromise(decodePageSize(value))).resolves.toBe(value);
  });

  it.each([0, -1, 101, 10.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid page size %s',
    async (value) => {
      await expect(
        Effect.runPromise(decodePageSize(value))
      ).rejects.toBeDefined();
    }
  );
});
