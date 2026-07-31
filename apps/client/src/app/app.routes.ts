import type { Routes } from '@angular/router';

/**
 * Browser entry routes.
 *
 * Workspace and channel selection use query parameters on the stable root
 * route. Loading the authenticated shell at the route boundary keeps its
 * application dependencies out of the bootstrap bundle, while query-parameter
 * changes keep the shell and its feature-scoped stores alive.
 */
export const appRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import(
        '@client/features/authentication/authentication-shell.component'
      ).then(
        ({ AuthenticationShellComponent }) => AuthenticationShellComponent
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
