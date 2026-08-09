import { Effect, Layer } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import {
  AccessTokenValidatorTag,
  type AccessTokenValidator,
} from '../access-token-validator';
import { checkAccessTokenValidationAvailability } from './check-access-token-validation-availability';

describe('checkAccessTokenValidationAvailability', () => {
  it('delegates to the active validation dependency without a user token', async () => {
    const checkAvailability = vi.fn(() => Effect.void);
    const validator: AccessTokenValidator = {
      validate: () => Effect.die(new Error('Unexpected token validation.')),
      checkAvailability,
    };

    await Effect.runPromise(
      checkAccessTokenValidationAvailability.pipe(
        Effect.provide(Layer.succeed(AccessTokenValidatorTag, validator))
      )
    );

    expect(checkAvailability).toHaveBeenCalledOnce();
  });
});
