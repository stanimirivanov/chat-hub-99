import { Effect, Stream } from 'effect';
import type { AuthenticationError } from '../authentication-error';
import {
  AuthenticationServiceTag,
  type AuthenticationService,
} from '../authentication-service';
import type { AuthenticationSessionChange } from '../authentication-session';

/**
 * Builds a stream of future authentication-session changes.
 *
 * Each stream subscription requests the configured `AuthenticationService`
 * and delegates to its session-change stream. The resulting stream can emit an
 * authenticated session or `null`, fail with a typed authentication error, and
 * requires an `AuthenticationService`.
 */
export const observeSessionChanges: Stream.Stream<
  AuthenticationSessionChange,
  AuthenticationError,
  AuthenticationService
> = Stream.unwrap(
  Effect.gen(function* () {
    const authenticationService = yield* AuthenticationServiceTag;

    return authenticationService.sessionChanges;
  })
);
