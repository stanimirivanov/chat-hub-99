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

  it.each([
    ['over_email_send_rate_limit', 'PasswordResetRateLimitedError'],
    ['over_request_rate_limit', 'PasswordResetRateLimitedError'],
    ['email_address_invalid', 'InvalidPasswordResetRequestInputError'],
  ] as const)('maps password-reset request %s', (code, tag) => {
    const result = mapAuthenticationError(
      makeAuthError(code),
      'request-password-reset'
    );

    expect(result._tag).toBe(tag);
  });

  it.each([
    ['over_email_send_rate_limit', 'ConfirmationEmailResendRateLimitedError'],
    ['over_request_rate_limit', 'ConfirmationEmailResendRateLimitedError'],
    ['email_address_invalid', 'InvalidConfirmationEmailResendInputError'],
  ] as const)('maps confirmation-email resend %s', (code, tag) => {
    const result = mapAuthenticationError(
      makeAuthError(code),
      'resend-confirmation-email'
    );

    expect(result._tag).toBe(tag);
  });

  it.each([
    ['weak_password', 'InvalidPasswordUpdateInputError'],
    ['same_password', 'PasswordUnchangedError'],
    ['session_not_found', 'PasswordRecoveryExpiredError'],
    ['session_expired', 'PasswordRecoveryExpiredError'],
    ['bad_jwt', 'PasswordRecoveryExpiredError'],
  ] as const)('maps password-update %s', (code, tag) => {
    const result = mapAuthenticationError(
      makeAuthError(code),
      'update-password'
    );

    expect(result._tag).toBe(tag);
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
