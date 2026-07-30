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
