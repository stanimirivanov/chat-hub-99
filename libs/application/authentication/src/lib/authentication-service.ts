import { Context, type Effect, type Stream } from 'effect';
import type { AuthenticationError } from './authentication-error';
import type { AuthenticationSession } from './authentication-session';

/**
 * Email/password credentials accepted by the authentication capability.
 */
export interface SignInCredentials {
  readonly email: string;
  readonly password: string;
}

/**
 * Outbound application port for authentication.
 *
 * The port describes authentication capabilities in application terminology.
 * Implementations may use Supabase or another provider, but provider-specific
 * clients, sessions, errors, and event types must not cross this boundary.
 */
export interface AuthenticationService {
  /**
   * Builds a program that retrieves the currently persisted session.
   *
   * Success is either the current application session or `null`. Expected
   * provider failures use the application authentication error vocabulary.
   */
  readonly getCurrentSession: () => Effect.Effect<
    AuthenticationSession | null,
    AuthenticationError
  >;

  /**
   * Builds a program that authenticates using email and password.
   */
  readonly signIn: (
    credentials: SignInCredentials
  ) => Effect.Effect<AuthenticationSession, AuthenticationError>;

  /**
   * Builds a program that ends the current authentication session.
   */
  readonly signOut: () => Effect.Effect<void, AuthenticationError>;

  /**
   * Produces future authentication-session changes.
   *
   * Every stream subscription owns one provider listener. Interrupting the
   * stream must release that listener.
   */
  readonly sessionChanges: Stream.Stream<
    AuthenticationSession | null,
    AuthenticationError
  >;
}

/**
 * Typed Effect service key used by authentication use cases.
 *
 * A Tag identifies the required capability; it is not an implementation.
 * The outer runtime supplies an implementation through a Layer.
 */
export const AuthenticationServiceTag =
  Context.GenericTag<AuthenticationService>(
    '@chat-hub/application/authentication/AuthenticationService'
  );
