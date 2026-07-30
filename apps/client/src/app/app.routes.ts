import type { Routes } from '@angular/router';
import { AuthenticationShellComponent } from '@client/features/authentication/authentication-shell.component';

/**
 * Browser entry routes.
 *
 * Workspace and channel selection use query parameters on the stable root
 * route. This keeps the authenticated shell and its feature-scoped stores
 * alive while browser history changes between selections.
 */
export const appRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: AuthenticationShellComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
