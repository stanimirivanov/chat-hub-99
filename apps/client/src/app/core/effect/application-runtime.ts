import { ManagedRuntime } from 'effect';
import { makeSupabaseClientConfig } from '../supabase/supabase-client-config';
import { makeApplicationInfrastructureLayer } from './application-infrastructure.layer';

const applicationLayer = makeApplicationInfrastructureLayer(
  makeSupabaseClientConfig()
);

/**
 * Long-lived Effect runtime used by Angular boundary services.
 *
 * `ManagedRuntime.make` materializes the Layer once, retains the constructed
 * services for reuse, and provides `runPromise` / `runFork` entry points for
 * executing Effects whose requirements are satisfied by that Layer.
 *
 * Application and infrastructure programs are interpreted here. Components
 * and Signal Stores do not access Supabase clients, Effect Layers, or runtime
 * construction.
 */
export const applicationRuntime = ManagedRuntime.make(applicationLayer);
