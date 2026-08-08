import { Effect, Layer } from 'effect';
import { AuthenticationServiceTag } from '@omoikane/application/authentication';
import { makeSupabaseAuthenticationService } from './supabase-authentication-service';
import { SupabaseAuthenticationClientTag } from './supabase-authentication-client';

/**
 * Construction recipe for the Supabase authentication adapter.
 *
 * The Layer supplies `AuthenticationServiceTag` and requires a configured
 * `SupabaseAuthenticationClientTag`. Runtime composition provides that client;
 * application use cases remain unaware of Supabase.
 */
export const SupabaseAuthenticationServiceLayer = Layer.effect(
  AuthenticationServiceTag,

  Effect.gen(function* () {
    const client = yield* SupabaseAuthenticationClientTag;

    return makeSupabaseAuthenticationService(client);
  })
);
