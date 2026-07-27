import { ManagedRuntime } from 'effect';
import { ApplicationLayer } from './application-layer';

/**
 * Shared runtime for application Effects.
 */
export const ApplicationRuntime = ManagedRuntime.make(ApplicationLayer);
