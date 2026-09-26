import type { Route } from '@angular/router';

const listing = () => import('./listing/listing-page').then((m) => m.ListingPageComponent);

/** Home page route (mounted at the root path by the app). */
export const homeRoute: Route = {
  path: '',
  pathMatch: 'full',
  loadComponent: () => import('./home/home-page').then((m) => m.HomePageComponent),
};

/** Child routes for the shell layout. Every page is lazy-loaded to keep the initial bundle small. */
export const catalogRoutes: Route[] = [
  { path: 'c/:slug', loadComponent: listing, data: { kind: 'category' } },
  { path: 'b/:slug', loadComponent: listing, data: { kind: 'brand' } },
  { path: 'collections/:slug', loadComponent: listing, data: { kind: 'collection' } },
  // Basic keyword results; the search engine module (BRD 03) replaces the data source, not the page.
  { path: 'search', loadComponent: listing, data: { kind: 'search' } },
  { path: 'p/:slug', loadComponent: () => import('./product/product-page').then((m) => m.ProductPageComponent) },
  { path: 'compare', loadComponent: () => import('./compare/compare-page').then((m) => m.ComparePageComponent) },
];
