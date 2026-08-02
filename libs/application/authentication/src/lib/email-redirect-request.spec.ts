import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import { decodeEmailRedirectRequest } from './email-redirect-request';

describe('decodeEmailRedirectRequest', () => {
  it('normalizes a usable email and absolute HTTP callback', async () => {
    await expect(
      Effect.runPromise(
        decodeEmailRedirectRequest(
          {
            email: '  owner@example.com  ',
            redirectUrl: '  http://localhost:4200/  ',
          },
          (field) => field
        )
      )
    ).resolves.toEqual({
      email: 'owner@example.com',
      redirectUrl: 'http://localhost:4200/',
    });
  });

  it.each([
    { input: undefined, field: 'email' as const },
    { input: null, field: 'email' as const },
    {
      input: { email: '   ', redirectUrl: 'http://localhost:4200/' },
      field: 'email' as const,
    },
    {
      input: { email: 'owner@example.com', redirectUrl: null },
      field: 'redirectUrl' as const,
    },
    {
      input: { email: 'owner@example.com', redirectUrl: '/relative' },
      field: 'redirectUrl' as const,
    },
    {
      input: {
        email: 'owner@example.com',
        redirectUrl: 'http:///missing-host',
      },
      field: 'redirectUrl' as const,
    },
  ])('rejects invalid $field input', async ({ input, field }) => {
    const result = await Effect.runPromise(
      decodeEmailRedirectRequest(input, (invalidField) => invalidField).pipe(
        Effect.either
      )
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBe(field);
    }
  });
});
