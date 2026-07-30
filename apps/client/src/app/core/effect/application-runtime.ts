import { Layer, ManagedRuntime } from 'effect';
import { SupabaseAuthenticationServiceLayer } from '@chat-hub/infrastructure/authentication';
import { SupabaseMessageRepositoryLayer } from '@chat-hub/infrastructure/message';
import { makeSupabaseClientConfig } from '../supabase/supabase-client-config';
import { makeSupabaseClientLayer } from '../supabase/supabase-client.layer';

/**
 * Infrastructure adapters required by current application use cases.
 *
 * These Layers still require their focused Supabase client services.
 */
const applicationServicesLayer = Layer.merge(
  SupabaseMessageRepositoryLayer,
  SupabaseAuthenticationServiceLayer
);

/**
 * Provides one configured browser Supabase client under every focused client
 * Tag required by the infrastructure adapters.
 */
const infrastructureClientLayer = makeSupabaseClientLayer(
  makeSupabaseClientConfig()
);

/**
 * Fully composed application Layer.
 *
 * Providing the client Layer removes the remaining infrastructure requirements
 * from the message and authentication service Layers.
 */
const applicationLayer = applicationServicesLayer.pipe(
  Layer.provide(infrastructureClientLayer)
);

/**
 * Long-lived Effect runtime used by Angular boundary services.
 *
 * Application and infrastructure programs are interpreted here. Components
 * and Signal Stores do not access Supabase clients, Effect Layers, or runtime
 * construction.
 */
export const applicationRuntime = ManagedRuntime.make(applicationLayer);
