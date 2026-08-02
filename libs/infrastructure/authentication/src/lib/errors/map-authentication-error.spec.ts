import type { AuthError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { mapAuthenticationError } from './map-authentication-error';

const makeAuthError = (code: string): AuthError =>
  ({
    name: 'AuthApiError',
    message: 'Provider error',
    status: 400,
    code,
  }) as AuthError;

describe('mapAuthenticationError', () => {
  it('maps invalid credentials', () => {
    const result = mapAuthenticationError(
      makeAuthError('invalid_credentials'),
      'sign-in'
    );

    expect(result).toMatchObject({
      _tag: 'InvalidCredentialsError',
    });
  });

  it.each([
    ['email_address_invalid', 'email'],
    ['weak_password', 'password'],
  ] as const)('maps sign-up %s to invalid %s input', (code, field) => {
    const result = mapAuthenticationError(makeAuthError(code), 'sign-up');

    expect(result).toMatchObject({
      _tag: 'InvalidSignUpInputError',
      field,
    });
  });

  it('maps an existing sign-up identity without exposing provider data', () => {
    const result = mapAuthenticationError(
      makeAuthError('user_already_exists'),
      'sign-up'
    );

    expect(result).toMatchObject({
      _tag: 'AccountAlreadyRegisteredError',
    });
  });

  it('maps other failures to unavailable', () => {
    const providerError = makeAuthError('unexpected_failure');

    const result = mapAuthenticationError(providerError, 'restore-session');

    expect(result).toMatchObject({
      _tag: 'AuthenticationUnavailableError',
      operation: 'restore-session',
      cause: providerError,
    });
  });
});
