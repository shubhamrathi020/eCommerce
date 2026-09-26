import { isDevMode } from '@angular/core';
import { Route } from '@angular/router';
import { NotFoundComponent } from '@ecom/shared/ui';
import { ShellLayoutComponent, StaticPageComponent } from '@ecom/storefront/shell';
import { catalogRoutes, homeRoute } from '@ecom/storefront/catalog';

export const appRoutes: Route[] = [
  {
    path: '',
    component: ShellLayoutComponent,
    children: [
      homeRoute,
      ...catalogRoutes,
      { path: 'pages/:slug', component: StaticPageComponent },
      // Component showcase, available only in development builds.
      ...(isDevMode() ? [{ path: '__ui', loadComponent: () => import('./showcase/showcase').then((m) => m.ShowcaseComponent) }] : []),
      { path: '**', component: NotFoundComponent },
    ],
  },
];
