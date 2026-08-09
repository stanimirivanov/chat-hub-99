import { Context, type Effect } from 'effect';
import type {
  AccessTokenValidationError,
  AccessTokenValidationUnavailableError,
} from './access-token-validation-error';
import type { AuthenticatedRequestIdentity } from './authenticated-request-identity';

/**
 * Focused outbound port for proving a server request's bearer credential.
 *
 * It is intentionally separate from `AuthenticationService`: the latter owns
 * browser session workflows, while this capability performs one stateless
 * server validation operation.
 */
export interface AccessTokenValidator {
  readonly validate: (
    accessToken: string
  ) => Effect.Effect<AuthenticatedRequestIdentity, AccessTokenValidationError>;

  /** Checks the dependency used to validate tokens without authenticating a user. */
  readonly checkAvailability: () => Effect.Effect<
    void,
    AccessTokenValidationUnavailableError
  >;
}

/** Effect service key supplied by the server's infrastructure Layer. */
export const AccessTokenValidatorTag = Context.GenericTag<AccessTokenValidator>(
  '@omoikane/application/authentication/AccessTokenValidator'
);
