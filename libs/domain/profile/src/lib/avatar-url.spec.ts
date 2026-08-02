import { Effect, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { AVATAR_URL_MAX_LENGTH, AvatarUrlSchema } from './avatar-url';

const decode = Schema.decodeUnknown(AvatarUrlSchema);

describe('AvatarUrlSchema', () => {
  it.each([
    'https://example.com/avatar.png',
    'https://cdn.example.com:8443/profiles/user.webp?size=96',
  ])('accepts supported HTTPS URL %s', async (value) => {
    await expect(Effect.runPromise(decode(value))).resolves.toBe(value);
  });

  it.each([
    'http://example.com/avatar.png',
    'HTTPS://example.com/avatar.png',
    'https://user:password@example.com/avatar.png',
    'https://example.com/avatar image.png',
    ' https://example.com/avatar.png ',
    'https:///avatar.png',
  ])('rejects unsupported avatar value %s', async (value) => {
    await expect(Effect.runPromise(decode(value))).rejects.toBeDefined();
  });

  it('rejects values beyond the persistence limit', async () => {
    const value = `https://example.com/${'a'.repeat(AVATAR_URL_MAX_LENGTH)}`;

    await expect(Effect.runPromise(decode(value))).rejects.toBeDefined();
  });
});
