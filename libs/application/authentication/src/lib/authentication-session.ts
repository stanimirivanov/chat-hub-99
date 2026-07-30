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
