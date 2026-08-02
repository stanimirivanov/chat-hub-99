import { Effect, Either } from 'effect';
import {
  AuthenticationUnavailableError,
  type AuthenticationError,
  type AuthenticationOperation,
  type AuthenticationService,
  type AuthenticationSession,
  type SignUpResult,
} from '@chat-hub/application/authentication';
import { mapAuthenticationError } from './errors';
import { mapAuthenticationSession } from './mapping';
import { makeSessionChangesStream } from './session';
import type { SupabaseAuthenticationClient } from './supabase-authentication-client';

/**
 * Converts an infrastructure session-mapping result into a precisely typed
 * Effect.
 *
 * Effect 3 supports interoperability between Either and Effect, but performing
 * the conversion explicitly here keeps the success and failure channels
 * visible to TypeScript across all branches of the Supabase adapter.
 */
const mapSession = (
  session: Parameters<typeof mapAuthenticationSession>[0],
  operation: AuthenticationOperation
): Effect.Effect<AuthenticationSession, AuthenticationError> =>
  Either.match(mapAuthenticationSession(session, operation), {
    onLeft: Effect.fail,
    onRight: Effect.succeed,
  });

/**
 * Constructs the Supabase implementation of the authentication application
 * port.
 *
 * Every operation returns a lazy Effect. Supabase promises execute only when
 * an outer runtime runs those Effects. Supabase sessions and errors are
 * translated before crossing the infrastructure boundary.
 */
export const makeSupabaseAuthenticationService = (
  client: SupabaseAuthenticationClient
): AuthenticationService => ({
  getCurrentSession: () =>
    Effect.tryPromise({
      try: () => client.auth.getSession(),

      catch: (cause) =>
        new AuthenticationUnavailableError({
          operation: 'restore-session',
          cause,
        }),
    }).pipe(
      Effect.flatMap(
        ({
          data,
          error,
        }): Effect.Effect<
          AuthenticationSession | null,
          AuthenticationError
        > => {
          if (error !== null) {
            return Effect.fail(
              mapAuthenticationError(error, 'restore-session')
            );
          }

          if (data.session === null) {
            return Effect.succeed(null);
          }

          return mapSession(data.session, 'restore-session');
        }
      )
    ),

  signIn: (credentials) =>
    Effect.tryPromise({
      try: () =>
        client.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        }),

      catch: (cause) =>
        new AuthenticationUnavailableError({
          operation: 'sign-in',
          cause,
        }),
    }).pipe(
      Effect.flatMap(
        ({
          data,
          error,
        }): Effect.Effect<AuthenticationSession, AuthenticationError> => {
          if (error !== null) {
            return Effect.fail(mapAuthenticationError(error, 'sign-in'));
          }

          if (data.session === null) {
            return Effect.fail(
              new AuthenticationUnavailableError({
                operation: 'sign-in',
                cause: new Error(
                  'Sign-in completed without returning a session.'
                ),
              })
            );
          }

          return mapSession(data.session, 'sign-in');
        }
      )
    ),

  signUp: (credentials) =>
    Effect.tryPromise({
      try: () =>
        client.auth.signUp({
          email: credentials.email,
          password: credentials.password,
        }),

      catch: (cause) =>
        new AuthenticationUnavailableError({
          operation: 'sign-up',
          cause,
        }),
    }).pipe(
      Effect.flatMap(
        ({ data, error }): Effect.Effect<SignUpResult, AuthenticationError> => {
          if (error !== null) {
            return Effect.fail(mapAuthenticationError(error, 'sign-up'));
          }

          if (data.session !== null) {
            return mapSession(data.session, 'sign-up').pipe(
              Effect.map((session) => ({
                status: 'authenticated' as const,
                session,
              }))
            );
          }

          if (data.user !== null) {
            return Effect.succeed({ status: 'confirmation-required' });
          }

          return Effect.fail(
            new AuthenticationUnavailableError({
              operation: 'sign-up',
              cause: new Error(
                'Sign-up completed without returning a user or session.'
              ),
            })
          );
        }
      )
    ),

  requestPasswordReset: (request) =>
    Effect.tryPromise({
      try: () =>
        client.auth.resetPasswordForEmail(request.email, {
          redirectTo: request.redirectUrl,
        }),

      catch: (cause) =>
        new AuthenticationUnavailableError({
          operation: 'request-password-reset',
          cause,
        }),
    }).pipe(
      Effect.flatMap(({ error }): Effect.Effect<void, AuthenticationError> => {
        if (error !== null) {
          return Effect.fail(
            mapAuthenticationError(error, 'request-password-reset')
          );
        }

        return Effect.void;
      })
    ),

  updatePassword: (password) =>
    Effect.tryPromise({
      try: () => client.auth.updateUser({ password }),

      catch: (cause) =>
        new AuthenticationUnavailableError({
          operation: 'update-password',
          cause,
        }),
    }).pipe(
      Effect.flatMap(({ error }): Effect.Effect<void, AuthenticationError> => {
        if (error !== null) {
          return Effect.fail(mapAuthenticationError(error, 'update-password'));
        }

        return Effect.void;
      })
    ),

  signOut: () =>
    Effect.tryPromise({
      try: () => client.auth.signOut(),

      catch: (cause) =>
        new AuthenticationUnavailableError({
          operation: 'sign-out',
          cause,
        }),
    }).pipe(
      Effect.flatMap(({ error }): Effect.Effect<void, AuthenticationError> => {
        if (error !== null) {
          return Effect.fail(mapAuthenticationError(error, 'sign-out'));
        }

        return Effect.void;
      })
    ),

  sessionChanges: makeSessionChangesStream(client),
});
