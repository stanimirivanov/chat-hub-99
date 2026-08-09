import { Effect } from 'effect';
import type { AccessTokenValidationUnavailableError } from '../access-token-validation-error';
import {
  AccessTokenValidatorTag,
  type AccessTokenValidator,
} from '../access-token-validator';

/** Builds the readiness check for the active token-validation dependency. */
export const checkAccessTokenValidationAvailability: Effect.Effect<
  void,
  AccessTokenValidationUnavailableError,
  AccessTokenValidator
> = Effect.flatMap(AccessTokenValidatorTag, (validator) =>
  validator.checkAvailability()
);
