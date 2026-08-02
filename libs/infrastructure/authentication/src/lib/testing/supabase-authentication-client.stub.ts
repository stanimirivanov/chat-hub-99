import { vi } from 'vitest';
import type { SupabaseAuthenticationClient } from '../supabase-authentication-client';
import { authenticationSession } from './authentication-fixtures';

export const makeSupabaseAuthenticationClientStub = (
  overrides: Partial<SupabaseAuthenticationClient['auth']> = {}
): SupabaseAuthenticationClient => ({
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    }),

    signInWithPassword: vi.fn().mockResolvedValue({
      data: {
        user: authenticationSession.user,
        session: authenticationSession,
      },
      error: null,
    }),

    signUp: vi.fn().mockResolvedValue({
      data: {
        user: authenticationSession.user,
        session: authenticationSession,
      },
      error: null,
    }),

    resend: vi.fn().mockResolvedValue({
      data: {
        user: null,
        session: null,
      },
      error: null,
    }),

    resetPasswordForEmail: vi.fn().mockResolvedValue({
      data: {},
      error: null,
    }),

    updateUser: vi.fn().mockResolvedValue({
      data: {
        user: authenticationSession.user,
      },
      error: null,
    }),

    signOut: vi.fn().mockResolvedValue({
      error: null,
    }),

    onAuthStateChange: vi.fn(() => ({
      data: {
        subscription: {
          id: 'auth-subscription',
          callback: vi.fn(),
          unsubscribe: vi.fn(),
        },
      },
    })),

    ...overrides,
  },
});
