import { Layer } from 'effect';
import { SupabaseAuthenticationServiceLayer } from '@chat-hub/infrastructure/authentication';
import { SupabaseMessageRepositoryLayer } from '@chat-hub/infrastructure/message';
import { SupabaseWorkspaceRepositoryLayer } from '@chat-hub/infrastructure/workspace';
import type { SupabaseClientConfig } from '../supabase/supabase-client-config';
import { makeSupabaseClientLayer } from '../supabase/supabase-client.layer';

/**
 * Creates the infrastructure dependency graph used by application Effects.
 */
export const makeApplicationInfrastructureLayer = (
  config: SupabaseClientConfig
) => {
  const supabaseClientLayer = makeSupabaseClientLayer(config);
  const applicationServicesLayer = Layer.merge(
    Layer.merge(
      SupabaseMessageRepositoryLayer,
      SupabaseAuthenticationServiceLayer
    ),
    SupabaseWorkspaceRepositoryLayer
  );

  return applicationServicesLayer.pipe(Layer.provide(supabaseClientLayer));
};
