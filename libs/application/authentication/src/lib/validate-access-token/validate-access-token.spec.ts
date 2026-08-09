import { Effect, Either, Layer } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import {
  AccessTokenValidatorTag,
  type AccessTokenValidator,
} from '../access-token-validator';
import { AccessTokenValidationUnavailableError } from '../access-token-validation-error';
import { validateAccessToken } from './validate-access-token';

const identity = {
  userId: '00000000-0000-4000-8000-000000000001',
} as const;

const makeLayer = (
  validate: AccessTokenValidator['validate']
): Layer.Layer<AccessTokenValidator> =>
  Layer.succeed(AccessTokenValidatorTag, {
    validate,
    checkAvailability: () => Effect.void,
  });

describe('validateAccessToken', () => {
  it('trims and delegates a usable token', async () => {
    const validate = vi.fn(() => Effect.succeed(identity));

    const result = await Effect.runPromise(
      validateAccessToken(' access-token ').pipe(
        Effect.provide(makeLayer(validate))
      )
    );

    expect(result).toEqual(identity);
    expect(validate).toHaveBeenCalledExactlyOnceWith('access-token');
  });

  it.each([undefined, null, '', '   ', 42])(
    'rejects unusable input without invoking infrastructure: %j',
    async (input) => {
      const validate = vi.fn(() => Effect.succeed(identity));

      const result = await Effect.runPromise(
        validateAccessToken(input).pipe(
          Effect.provide(makeLayer(validate)),
          Effect.either
        )
      );

      expect(result).toMatchObject({
        _tag: 'Left',
        left: { _tag: 'InvalidAccessTokenError' },
      });
      expect(validate).not.toHaveBeenCalled();
    }
  );

  it('preserves provider-independent validation failures', async () => {
    const failure = new AccessTokenValidationUnavailableError({
      cause: new Error('identity provider unavailable'),
    });
    const validate = vi.fn(() => Effect.fail(failure));

    const result = await Effect.runPromise(
      validateAccessToken('access-token').pipe(
        Effect.provide(makeLayer(validate)),
        Effect.either
      )
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBe(failure);
    }
  });
});
