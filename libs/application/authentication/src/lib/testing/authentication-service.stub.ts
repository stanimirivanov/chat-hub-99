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
  signUp: () => unexpectedOperation('signUp'),
  requestPasswordReset: () => unexpectedOperation('requestPasswordReset'),
  updatePassword: () => unexpectedOperation('updatePassword'),
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

export const makeSignUpAuthenticationService = (
  implementation: AuthenticationService['signUp']
) => {
  const signUp = vi.fn(implementation);

  return {
    signUp,
    serviceLayer: makeAuthenticationServiceLayer({ signUp }),
  };
};

export const makeRequestPasswordResetAuthenticationService = (
  implementation: AuthenticationService['requestPasswordReset']
) => {
  const requestPasswordReset = vi.fn(implementation);

  return {
    requestPasswordReset,
    serviceLayer: makeAuthenticationServiceLayer({ requestPasswordReset }),
  };
};

export const makeUpdatePasswordAuthenticationService = (
  implementation: AuthenticationService['updatePassword']
) => {
  const updatePassword = vi.fn(implementation);

  return {
    updatePassword,
    serviceLayer: makeAuthenticationServiceLayer({ updatePassword }),
  };
};
