import { Layer } from 'effect';
import { SupabaseMessageRepositoryLayer } from '@chat-hub/infrastructure/message';
import type { SupabaseClientConfig } from '../supabase/supabase-client-config';
import { makeSupabaseClientLayer } from '../supabase/supabase-client.layer';

/**
 * Creates the infrastructure dependency graph used by application Effects.
 */
export const makeApplicationInfrastructureLayer = (
  config: SupabaseClientConfig
) => {
  const supabaseClientLayer = makeSupabaseClientLayer(config);

  return SupabaseMessageRepositoryLayer.pipe(
    Layer.provide(supabaseClientLayer)
  );
};
