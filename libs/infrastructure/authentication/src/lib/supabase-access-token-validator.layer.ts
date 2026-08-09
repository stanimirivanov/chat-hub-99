import { Effect, Layer } from 'effect';
import { AccessTokenValidatorTag } from '@omoikane/application/authentication';
import {
  SupabaseAccessTokenClientTag,
  type SupabaseAccessTokenClient,
} from './supabase-access-token-client';
import { makeSupabaseAccessTokenValidator } from './supabase-access-token-validator';

/**
 * Supplies the application token-validator port from a configured Supabase
 * client. The remaining client requirement is fulfilled at the outer runtime.
 */
export const SupabaseAccessTokenValidatorLayer: Layer.Layer<
  import('@omoikane/application/authentication').AccessTokenValidator,
  never,
  SupabaseAccessTokenClient
> = Layer.effect(
  AccessTokenValidatorTag,
  Effect.map(SupabaseAccessTokenClientTag, makeSupabaseAccessTokenValidator)
);
