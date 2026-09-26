import { isDevMode } from '@angular/core';
import { Route } from '@angular/router';
import { RedirectOrNotFoundComponent, ShellLayoutComponent, StaticPageComponent } from '@ecom/storefront/shell';
import { catalogRoutes, homeRoute } from '@ecom/storefront/catalog';
import { accountRoutes } from '@ecom/storefront/account';
import { checkoutRoutes } from '@ecom/storefront/checkout';

export const appRoutes: Route[] = [
  {
    path: '',
    component: ShellLayoutComponent,
    children: [
      homeRoute,
      ...catalogRoutes,
      ...checkoutRoutes,
      ...accountRoutes,
      { path: 'pages/:slug', component: StaticPageComponent },
      // Component showcase, available only in development builds.
      ...(isDevMode() ? [{ path: '__ui', loadComponent: () => import('./showcase/showcase').then((m) => m.ShowcaseComponent) }] : []),
      { path: '**', component: RedirectOrNotFoundComponent },
    ],
  },
];
