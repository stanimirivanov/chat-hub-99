import { Effect, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  MESSAGE_CONTENT_MAX_LENGTH,
  MessageContentSchema,
} from './message-content';

describe('MessageContent', () => {
  const decode = Schema.decodeUnknown(MessageContentSchema);

  it('accepts valid content', async () => {
    const result = await Effect.runPromise(decode('Hello'));

    expect(result).toBe('Hello');
  });

  it('trims surrounding whitespace', async () => {
    const result = await Effect.runPromise(decode('  Hello  '));

    expect(result).toBe('Hello');
  });

  it('rejects blank content', async () => {
    await expect(Effect.runPromise(decode('   '))).rejects.toBeDefined();
  });

  it('accepts content at the maximum length', async () => {
    const content = 'a'.repeat(MESSAGE_CONTENT_MAX_LENGTH);

    const result = await Effect.runPromise(decode(content));

    expect(result).toHaveLength(MESSAGE_CONTENT_MAX_LENGTH);
  });

  it('rejects content beyond the maximum length', async () => {
    const content = 'a'.repeat(MESSAGE_CONTENT_MAX_LENGTH + 1);

    await expect(Effect.runPromise(decode(content))).rejects.toBeDefined();
  });
});
