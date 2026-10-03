import type { Route } from '@angular/router';
import { createAuthGuard, permissionGuard as basePermissionGuard } from '@ecom/shared/state';
import { SellerShellComponent } from './seller-shell';

const authGuard = createAuthGuard('/login');
const permissionGuard = (permission: string) => basePermissionGuard(permission, '/');

/**
 * Seller portal routes. Guards are a browser-side convenience; the (mock) API works out which seller is calling from the
 * signed-in user on every request and never trusts an id from the browser, exactly as the real backend must.
 * Anyone with an account can apply; the portal's working pages need the `seller:portal` permission, which approval grants.
 */
export const sellerRoutes: Route[] = [
  { path: 'login', loadComponent: () => import('./auth-pages').then((m) => m.SellerLoginComponent) },
  { path: 'register', loadComponent: () => import('./auth-pages').then((m) => m.SellerRegisterComponent) },
  {
    path: '',
    component: SellerShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./dashboard-page').then((m) => m.DashboardPageComponent) },
      { path: 'apply', loadComponent: () => import('./apply-page').then((m) => m.ApplyPageComponent) },
      { path: 'products', canActivate: [permissionGuard('seller:portal')], loadComponent: () => import('./products-page').then((m) => m.ProductsPageComponent) },
      { path: 'products/new', canActivate: [permissionGuard('seller:portal')], loadComponent: () => import('./product-form-page').then((m) => m.ProductFormPageComponent) },
      { path: 'products/:id', canActivate: [permissionGuard('seller:portal')], loadComponent: () => import('./product-form-page').then((m) => m.ProductFormPageComponent) },
      { path: 'orders', canActivate: [permissionGuard('seller:portal')], loadComponent: () => import('./orders-page').then((m) => m.OrdersPageComponent) },
      { path: 'payouts', canActivate: [permissionGuard('seller:portal')], loadComponent: () => import('./payouts-page').then((m) => m.PayoutsPageComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
