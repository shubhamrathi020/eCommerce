import { isDevMode } from '@angular/core';
import { Route } from '@angular/router';
import { NotFoundComponent, ShellLayoutComponent, StaticPageComponent } from '@ecom/storefront/shell';
import { HomePlaceholderComponent } from './home-placeholder';

export const appRoutes: Route[] = [
  {
    path: '',
    component: ShellLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', component: HomePlaceholderComponent },
      { path: 'pages/:slug', component: StaticPageComponent },
      // Component showcase, available only in development builds.
      ...(isDevMode() ? [{ path: '__ui', loadComponent: () => import('./showcase/showcase').then((m) => m.ShowcaseComponent) }] : []),
      { path: '**', component: NotFoundComponent },
    ],
  },
];
