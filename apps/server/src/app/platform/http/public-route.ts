import { SetMetadata } from '@nestjs/common';

/** Metadata inspected by the global guard for intentionally public routes. */
export const PUBLIC_ROUTE = Symbol('PUBLIC_ROUTE');

/** Marks a controller or handler as an explicit authentication exception. */
export const PublicRoute = (): ClassDecorator & MethodDecorator =>
  SetMetadata(PUBLIC_ROUTE, true);
