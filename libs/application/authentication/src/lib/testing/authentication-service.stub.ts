import { Effect, Layer, Stream } from 'effect';
import { vi } from 'vitest';
import {
  AuthenticationServiceTag,
  type AuthenticationService,
} from '../authentication-service';

const unexpectedOperation = (
  operation: keyof AuthenticationService
): Effect.Effect<never> =>
  Effect.die(
    new Error(`Unexpected AuthenticationService.${operation} call in test`)
  );

export const makeAuthenticationServiceStub = (
  overrides: Partial<AuthenticationService> = {}
): AuthenticationService => ({
  getCurrentSession: () => unexpectedOperation('getCurrentSession'),
  signIn: () => unexpectedOperation('signIn'),
  signOut: () => unexpectedOperation('signOut'),
  sessionChanges: Stream.die(
    new Error(
      'Unexpected AuthenticationService.sessionChanges subscription in test'
    )
  ),
  ...overrides,
});

export const makeAuthenticationServiceLayer = (
  overrides: Partial<AuthenticationService> = {}
): Layer.Layer<AuthenticationService> =>
  Layer.succeed(
    AuthenticationServiceTag,
    makeAuthenticationServiceStub(overrides)
  );

export const makeSignInAuthenticationService = (
  implementation: AuthenticationService['signIn']
) => {
  const signIn = vi.fn(implementation);

  return {
    signIn,
    serviceLayer: makeAuthenticationServiceLayer({ signIn }),
  };
};
