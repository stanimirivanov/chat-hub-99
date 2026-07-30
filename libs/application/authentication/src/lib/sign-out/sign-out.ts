import { Effect } from 'effect';
import type { AuthenticationError } from '../authentication-error';
import {
  AuthenticationServiceTag,
  type AuthenticationService,
} from '../authentication-service';

/**
 * Builds a program that ends the current authentication session.
 *
 * The Effect succeeds with `void`, fails with the application authentication
 * error vocabulary, and requires an `AuthenticationService`.
 */
export const signOut: Effect.Effect<
  void,
  AuthenticationError,
  AuthenticationService
> = Effect.gen(function* () {
  const authenticationService = yield* AuthenticationServiceTag;

  return yield* authenticationService.signOut();
});
