import { ManagedRuntime } from 'effect';
import { ApplicationLayer } from './application-layer';

/**
 * Long-lived Effect runtime containing the application's infrastructure
 * services.
 */
export const applicationRuntime = ManagedRuntime.make(ApplicationLayer);
