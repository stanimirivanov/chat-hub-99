import { Effect, Either, Stream } from 'effect';
import type {
  AuthenticationError,
  AuthenticationSession,
} from '@chat-hub/application/authentication';
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
): Stream.Stream<AuthenticationSession | null, AuthenticationError> =>
  Stream.asyncPush<AuthenticationSession | null, AuthenticationError>(
    (emit) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          const {
            data: { subscription },
          } = client.auth.onAuthStateChange((_event, session) => {
            if (session === null) {
              emit.single(null);
              return;
            }

            const mapped = mapAuthenticationSession(session, 'observe-session');

            Either.match(mapped, {
              onLeft: (error) => {
                emit.fail(error);
              },
              onRight: (authenticationSession) => {
                emit.single(authenticationSession);
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
