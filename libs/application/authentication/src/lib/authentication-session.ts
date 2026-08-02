import { Schema } from 'effect';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Authentication information required by the application presentation layer.
 */
export interface AuthenticationSession {
  readonly userId: string;
  readonly email: string;
}

/**
 * Provider-neutral authentication-session notification.
 *
 * Ordinary session changes drive signed-in/signed-out state. A password
 * recovery notification carries the same validated session plus the intent
 * required to select the password-update workflow.
 */
export type AuthenticationSessionChange =
  | {
      readonly type: 'session';
      readonly session: AuthenticationSession | null;
    }
  | {
      readonly type: 'password-recovery';
      readonly session: AuthenticationSession;
    };

/**
 * Runtime contract for authentication information exposed to the application.
 *
 * Provider adapters decode external values through this schema, preventing
 * malformed identities from crossing the infrastructure boundary.
 */
export const AuthenticationSessionSchema: Schema.Schema<AuthenticationSession> =
  Schema.Struct({
    userId: Schema.String.pipe(Schema.pattern(uuidPattern)),
    email: Schema.NonEmptyTrimmedString,
  });
