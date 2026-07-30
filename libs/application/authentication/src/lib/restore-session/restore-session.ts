import { Effect } from 'effect';
import type { AuthenticationError } from '../authentication-error';
import {
  AuthenticationServiceTag,
  type AuthenticationService,
} from '../authentication-service';
import type { AuthenticationSession } from '../authentication-session';

/**
 * Builds a program that restores the persisted authentication session.
 *
 * The Effect succeeds with the current session or `null`, preserves the typed
 * application authentication failure channel, and requires an
 * `AuthenticationService` supplied by the outer runtime.
 *
 * This function only describes work; it does not execute the provider call.
 */
export const restoreSession: Effect.Effect<
  AuthenticationSession | null,
  AuthenticationError,
  AuthenticationService
> = Effect.gen(function* () {
  const authenticationService = yield* AuthenticationServiceTag;

  return yield* authenticationService.getCurrentSession();
});
