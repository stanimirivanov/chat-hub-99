import { Effect, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { MessageRevisionPageSizeSchema } from './message-revision-page-size';

const decode = Schema.decodeUnknown(MessageRevisionPageSizeSchema);

describe('MessageRevisionPageSizeSchema', () => {
  it.each([1, 50, 100])('accepts supported page size %s', async (value) => {
    await expect(Effect.runPromise(decode(value))).resolves.toBe(value);
  });

  it.each([0, -1, 101, 1.5])(
    'rejects unsupported page size %s',
    async (value) => {
      await expect(Effect.runPromise(decode(value))).rejects.toBeDefined();
    }
  );
});
