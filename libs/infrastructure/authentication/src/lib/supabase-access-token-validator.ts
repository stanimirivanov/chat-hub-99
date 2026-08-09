import { Effect, Schema } from 'effect';
import {
  AccessTokenValidationUnavailableError,
  AuthenticatedRequestIdentitySchema,
  InvalidAccessTokenError,
  type AccessTokenValidationError,
  type AccessTokenValidator,
  type AuthenticatedRequestIdentity,
} from '@omoikane/application/authentication';
import type { SupabaseAccessTokenClient } from './supabase-access-token-client';

const decodeIdentity = Schema.decodeUnknownEither(
  AuthenticatedRequestIdentitySchema
);

const isRejectedCredential = (error: { readonly status?: number }): boolean =>
  error.status === 401 || error.status === 403;

/** Constructs the Supabase implementation of stateless access-token validation. */
export const makeSupabaseAccessTokenValidator = (
  client: SupabaseAccessTokenClient
): AccessTokenValidator => ({
  validate: (accessToken) =>
    Effect.tryPromise({
      try: () => client.getUser(accessToken),
      catch: (cause) => new AccessTokenValidationUnavailableError({ cause }),
    }).pipe(
      Effect.flatMap(
        ({
          data,
          error,
        }): Effect.Effect<
          AuthenticatedRequestIdentity,
          AccessTokenValidationError
        > => {
          if (error !== null) {
            return isRejectedCredential(error)
              ? Effect.fail(new InvalidAccessTokenError())
              : Effect.fail(
                  new AccessTokenValidationUnavailableError({ cause: error })
                );
          }

          if (data.user === null) {
            return Effect.fail(new InvalidAccessTokenError());
          }

          return decodeIdentity({ userId: data.user.id }).pipe(
            Effect.mapError(
              (cause) => new AccessTokenValidationUnavailableError({ cause })
            )
          );
        }
      )
    ),

  checkAvailability: () =>
    Effect.tryPromise({
      try: () => client.checkHealth(),
      catch: (cause) => new AccessTokenValidationUnavailableError({ cause }),
    }),
});
