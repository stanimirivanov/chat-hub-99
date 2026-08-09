import { Effect } from 'effect';
import type { AuthenticationError } from '../authentication-error';
import {
  AuthenticationServiceTag,
  type AuthenticationService,
} from '../authentication-service';

/**
 * Retrieves one transient browser access token for a trusted server request.
 * The returned value must not be placed in application or presentation state.
 */
export const getCurrentAccessToken: Effect.Effect<
  string,
  AuthenticationError,
  AuthenticationService
> = Effect.flatMap(AuthenticationServiceTag, (service) =>
  service.getCurrentAccessToken()
);
