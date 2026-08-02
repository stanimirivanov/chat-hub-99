import { Context, type Effect, type Stream } from 'effect';
import type { AuthenticationError } from './authentication-error';
import type { AuthenticationSession } from './authentication-session';
import type { EmailPasswordCredentials } from './email-password-credentials';

/**
 * Successful account-registration outcomes supported by the provider-neutral
 * application boundary.
 */
export type SignUpResult =
  | {
      readonly status: 'authenticated';
      readonly session: AuthenticationSession;
    }
  | {
      readonly status: 'confirmation-required';
    };

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
    credentials: EmailPasswordCredentials
  ) => Effect.Effect<AuthenticationSession, AuthenticationError>;

  /**
   * Builds a program that registers an email/password account.
   *
   * Providers may either create a session immediately or require email
   * confirmation before authentication is possible.
   */
  readonly signUp: (
    credentials: EmailPasswordCredentials
  ) => Effect.Effect<SignUpResult, AuthenticationError>;

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
