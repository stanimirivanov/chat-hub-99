import type {
  AuthChangeEvent,
  AuthError,
  AuthResponse,
  AuthTokenResponsePassword,
  Session,
  Subscription,
  UserResponse,
} from '@supabase/supabase-js';
import { Context } from 'effect';

/**
 * Minimal result returned by Supabase session restoration.
 */
export interface SupabaseSessionResult {
  readonly data: {
    readonly session: Session | null;
  };
  readonly error: AuthError | null;
}

/**
 * Minimal result returned by Supabase sign-out.
 */
export interface SupabaseSignOutResult {
  readonly error: AuthError | null;
}

/** Minimal result returned when requesting a password-reset email. */
export type SupabasePasswordResetRequestResult =
  | { readonly data: Record<string, never>; readonly error: null }
  | { readonly data: null; readonly error: AuthError };

/**
 * Authentication-only projection of the Supabase browser client.
 *
 * The adapter depends only on operations required by this slice. This avoids
 * coupling authentication code to database, storage, or realtime APIs.
 */
export interface SupabaseAuthenticationClient {
  readonly auth: {
    readonly getSession: () => Promise<SupabaseSessionResult>;

    readonly signInWithPassword: (credentials: {
      readonly email: string;
      readonly password: string;
    }) => Promise<AuthTokenResponsePassword>;

    readonly signUp: (credentials: {
      readonly email: string;
      readonly password: string;
    }) => Promise<AuthResponse>;

    readonly resetPasswordForEmail: (
      email: string,
      options: { readonly redirectTo: string }
    ) => Promise<SupabasePasswordResetRequestResult>;

    readonly updateUser: (attributes: {
      readonly password: string;
    }) => Promise<UserResponse>;

    readonly signOut: () => Promise<SupabaseSignOutResult>;

    readonly onAuthStateChange: (
      callback: (event: AuthChangeEvent, session: Session | null) => void
    ) => {
      readonly data: {
        readonly subscription: Subscription;
      };
    };
  };
}

/**
 * Effect service key for the authentication-shaped Supabase client.
 *
 * The Angular runtime provides the configured browser client under this Tag.
 */
export const SupabaseAuthenticationClientTag =
  Context.GenericTag<SupabaseAuthenticationClient>(
    '@chat-hub/infrastructure/authentication/SupabaseAuthenticationClient'
  );
