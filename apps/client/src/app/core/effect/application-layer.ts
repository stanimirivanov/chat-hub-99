import { makeSupabaseClientConfig } from '../supabase/supabase-client-config';
import { makeApplicationInfrastructureLayer } from './application-infrastructure.layer';

/**
 * Fully configured application infrastructure Layer.
 */
export const ApplicationLayer = makeApplicationInfrastructureLayer(
  makeSupabaseClientConfig()
);
