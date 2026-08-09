import type { AuthError, User } from '@supabase/supabase-js';
import { Effect, Either } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseAccessTokenClient } from './supabase-access-token-client';
import { makeSupabaseAccessTokenValidator } from './supabase-access-token-validator';

const user = { id: '00000000-0000-4000-8000-000000000001' } as User;

const makeClient = (
  overrides: Partial<SupabaseAccessTokenClient> = {}
): SupabaseAccessTokenClient => ({
  getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
  checkHealth: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const authError = (status: number): AuthError =>
  ({ name: 'AuthApiError', message: 'provider detail', status }) as AuthError;

describe('makeSupabaseAccessTokenValidator', () => {
  it('maps a current Supabase user to the minimum request identity', async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user }, error: null });
    const validator = makeSupabaseAccessTokenValidator(makeClient({ getUser }));

    await expect(
      Effect.runPromise(validator.validate('secret-token'))
    ).resolves.toEqual({
      userId: user.id,
    });
    expect(getUser).toHaveBeenCalledExactlyOnceWith('secret-token');
  });

  it.each([401, 403])(
    'maps HTTP %s to an invalid credential',
    async (status) => {
      const validator = makeSupabaseAccessTokenValidator(
        makeClient({
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: authError(status),
          }),
        })
      );

      const result = await Effect.runPromise(
        validator.validate('secret-token').pipe(Effect.either)
      );

      expect(result).toMatchObject({
        _tag: 'Left',
        left: { _tag: 'InvalidAccessTokenError' },
      });
    }
  );

  it('maps dependency failures without retaining the token', async () => {
    const cause = new Error('network unavailable');
    const validator = makeSupabaseAccessTokenValidator(
      makeClient({ getUser: vi.fn().mockRejectedValue(cause) })
    );

    const result = await Effect.runPromise(
      validator.validate('must-not-escape').pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'AccessTokenValidationUnavailableError',
        cause,
      });
      expect(JSON.stringify(result.left)).not.toContain('must-not-escape');
    }
  });

  it('checks Supabase Auth availability independently of a user token', async () => {
    const checkHealth = vi.fn().mockResolvedValue(undefined);
    const validator = makeSupabaseAccessTokenValidator(
      makeClient({ checkHealth })
    );

    await Effect.runPromise(validator.checkAvailability());

    expect(checkHealth).toHaveBeenCalledOnce();
  });
});
