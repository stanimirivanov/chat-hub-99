import { environment } from '../../../environments/environment';
import { makeApplicationInfrastructureLayer } from './application-infrastructure.layer';

/**
 * Root Effect Layer for the Angular application.
 */
export const ApplicationLayer = makeApplicationInfrastructureLayer({
  url: environment.supabase.url,
  publishableKey: environment.supabase.publishableKey,
});
