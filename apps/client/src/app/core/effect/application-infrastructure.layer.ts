import { Layer } from 'effect';
import { SupabaseAuthenticationServiceLayer } from '@chat-hub/infrastructure/authentication';
import { SupabaseChannelRepositoryLayer } from '@chat-hub/infrastructure/channel';
import { SupabaseMessageRepositoryLayer } from '@chat-hub/infrastructure/message';
import { SupabaseProfileRepositoryLayer } from '@chat-hub/infrastructure/profile';
import { SupabaseWorkspaceRepositoryLayer } from '@chat-hub/infrastructure/workspace';
import type { SupabaseClientConfig } from '../supabase/supabase-client-config';
import { makeSupabaseClientLayer } from '../supabase/supabase-client.layer';

/**
 * Builds the complete infrastructure dependency graph for application Effects.
 *
 * In Effect, a `Tag` is a typed key through which a program requests a
 * capability, while a `Layer` is a recipe for constructing and supplying that
 * capability. The adapter Layers below are peers: each supplies one
 * application service and requires a capability-specific Supabase client.
 *
 * `Layer.mergeAll` combines those independent recipes into one Layer that
 * supplies all services. `Layer.provide` then connects the shared
 * Supabase-client Layer to their client requirements. The returned Layer has
 * no remaining dependencies, so it can be used to create the application's
 * managed runtime.
 */
export const makeApplicationInfrastructureLayer = (
  config: SupabaseClientConfig
) => {
  const supabaseClientLayer = makeSupabaseClientLayer(config);
  const applicationServicesLayer = Layer.mergeAll(
    SupabaseMessageRepositoryLayer,
    SupabaseAuthenticationServiceLayer,
    SupabaseChannelRepositoryLayer,
    SupabaseProfileRepositoryLayer,
    SupabaseWorkspaceRepositoryLayer
  );

  return applicationServicesLayer.pipe(Layer.provide(supabaseClientLayer));
};
