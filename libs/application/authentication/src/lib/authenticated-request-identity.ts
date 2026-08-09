import { Schema } from 'effect';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Minimum provider-independent identity established for an HTTP request.
 *
 * Keeping only the canonical user identifier prevents provider claims and
 * Supabase user objects from becoming application inputs by accident.
 */
export interface AuthenticatedRequestIdentity {
  readonly userId: string;
}

/** Runtime decoder used where an identity provider crosses into application code. */
export const AuthenticatedRequestIdentitySchema: Schema.Schema<AuthenticatedRequestIdentity> =
  Schema.Struct({
    userId: Schema.String.pipe(Schema.pattern(uuidPattern)),
  });
