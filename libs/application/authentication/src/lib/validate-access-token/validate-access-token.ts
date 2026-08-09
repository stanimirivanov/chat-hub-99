import { Effect } from 'effect';
import type { AccessTokenValidationError } from '../access-token-validation-error';
import {
  AccessTokenValidatorTag,
  type AccessTokenValidator,
} from '../access-token-validator';
import type { AuthenticatedRequestIdentity } from '../authenticated-request-identity';
import { InvalidAccessTokenError } from '../access-token-validation-error';

/**
 * Builds the provider-independent workflow that validates one bearer token.
 *
 * Unknown input is accepted at this outer application boundary so missing or
 * non-string transport values fail safely instead of causing property-access
 * exceptions. The raw token is never retained in an error.
 */
export const validateAccessToken = (
  input: unknown
): Effect.Effect<
  AuthenticatedRequestIdentity,
  AccessTokenValidationError,
  AccessTokenValidator
> => {
  const accessToken = typeof input === 'string' ? input.trim() : '';

  if (!accessToken) {
    return Effect.fail(new InvalidAccessTokenError());
  }

  return Effect.flatMap(AccessTokenValidatorTag, (validator) =>
    validator.validate(accessToken)
  );
};
