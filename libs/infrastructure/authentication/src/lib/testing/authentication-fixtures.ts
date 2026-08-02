import type { AuthError, Session } from '@supabase/supabase-js';

export const authenticationSession = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'owner@chat-hub.local',
  },
} as Session;

export const invalidCredentialsError = {
  name: 'AuthApiError',
  message: 'Invalid credentials',
  status: 400,
  code: 'invalid_credentials',
} as AuthError;

export const accountAlreadyRegisteredError = {
  name: 'AuthApiError',
  message: 'User already registered',
  status: 422,
  code: 'user_already_exists',
} as AuthError;

export const passwordResetRateLimitError = {
  name: 'AuthApiError',
  message: 'Email rate limit exceeded',
  status: 429,
  code: 'over_email_send_rate_limit',
} as AuthError;

export const confirmationEmailResendRateLimitError = {
  name: 'AuthApiError',
  message: 'Email rate limit exceeded',
  status: 429,
  code: 'over_email_send_rate_limit',
} as AuthError;

export const userNotFoundError = {
  name: 'AuthApiError',
  message: 'User not found',
  status: 404,
  code: 'user_not_found',
} as AuthError;

export const weakPasswordError = {
  name: 'AuthApiError',
  message: 'Password is too weak',
  status: 422,
  code: 'weak_password',
} as AuthError;
