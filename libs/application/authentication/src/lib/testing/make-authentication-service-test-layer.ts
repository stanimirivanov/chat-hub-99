import { Effect, Layer, Stream } from 'effect';
import type { AuthenticationService } from '../authentication-service';
import { AuthenticationServiceTag } from '../authentication-service';

/**
 * Creates a fresh authentication service test double and its Layer.
 *
 * Each test receives independent functions and call history. Operations not
 * relevant to a test use inert defaults rather than shared module-level mocks.
 */
export const makeAuthenticationServiceTestLayer = (
  overrides: Partial<AuthenticationService> = {}
): {
  readonly service: AuthenticationService;
  readonly layer: Layer.Layer<AuthenticationService>;
} => {
  const service: AuthenticationService = {
    getCurrentSession: () => Effect.succeed(null),

    signIn: () =>
      Effect.dieMessage('AuthenticationService.signIn was not configured.'),

    signOut: () => Effect.succeed(undefined),

    sessionChanges: Stream.empty,

    ...overrides,
  };

  return {
    service,
    layer: Layer.succeed(AuthenticationServiceTag, service),
  };
};
