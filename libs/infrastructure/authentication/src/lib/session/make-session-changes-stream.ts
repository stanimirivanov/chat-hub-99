import { Effect, Either, Stream } from 'effect';
import {
  AuthenticationUnavailableError,
  type AuthenticationError,
  type AuthenticationSessionChange,
} from '@omoikane/application/authentication';
import type { SupabaseAuthenticationClient } from '../supabase-authentication-client';
import { mapAuthenticationSession } from '../mapping/map-authentication-session';

/**
 * Adapts Supabase's callback-based auth listener into a scoped Effect Stream.
 *
 * Starting the stream registers one `onAuthStateChange` listener. Interrupting
 * the stream closes its Scope and invokes `unsubscribe`, preventing listener
 * leaks and duplicate state updates.
 */
export const makeSessionChangesStream = (
  client: SupabaseAuthenticationClient
): Stream.Stream<AuthenticationSessionChange, AuthenticationError> =>
  Stream.asyncPush<AuthenticationSessionChange, AuthenticationError>(
    (emit) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          const {
            data: { subscription },
          } = client.auth.onAuthStateChange((event, session) => {
            if (session === null) {
              if (event === 'PASSWORD_RECOVERY') {
                emit.fail(
                  new AuthenticationUnavailableError({
                    operation: 'observe-session',
                    cause: new Error(
                      'Password recovery event did not include a session.'
                    ),
                  })
                );
                return;
              }

              emit.single({ type: 'session', session: null });
              return;
            }

            const mapped = mapAuthenticationSession(session, 'observe-session');

            Either.match(mapped, {
              onLeft: (error) => {
                emit.fail(error);
              },
              onRight: (authenticationSession) => {
                emit.single(
                  event === 'PASSWORD_RECOVERY'
                    ? {
                        type: 'password-recovery',
                        session: authenticationSession,
                      }
                    : {
                        type: 'session',
                        session: authenticationSession,
                      }
                );
              },
            });
          });

          return subscription;
        }),

        (subscription) =>
          Effect.sync(() => {
            subscription.unsubscribe();
          })
      ),

    {
      bufferSize: 16,
      strategy: 'sliding',
    }
  );
