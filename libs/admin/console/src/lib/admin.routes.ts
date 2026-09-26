import type { Route } from '@angular/router';
import { createAuthGuard, permissionGuard as basePermissionGuard } from '@ecom/shared/state';
import { AdminShellComponent } from './admin-shell';

const authGuard = createAuthGuard('/login');
const permissionGuard = (permission: string) => basePermissionGuard(permission, '/login');

/**
 * Admin routes. Guards are a browser-side convenience; the (mock) API enforces the same permissions
 * on every call, exactly as the real backend must.
 */
export const adminRoutes: Route[] = [
  { path: 'login', loadComponent: () => import('./login-page').then((m) => m.AdminLoginComponent) },
  {
    path: '',
    component: AdminShellComponent,
    canActivate: [authGuard, permissionGuard('order:read:any')],
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./dashboard/dashboard-page').then((m) => m.DashboardPageComponent) },
      { path: 'products', canActivate: [permissionGuard('product:read')], loadComponent: () => import('./products/products-page').then((m) => m.ProductsPageComponent) },
      { path: 'products/new', canActivate: [permissionGuard('product:write')], loadComponent: () => import('./products/product-form-page').then((m) => m.ProductFormPageComponent) },
      { path: 'products/:id', canActivate: [permissionGuard('product:read')], loadComponent: () => import('./products/product-form-page').then((m) => m.ProductFormPageComponent) },
      { path: 'orders', loadComponent: () => import('./orders/orders-page').then((m) => m.OrdersPageComponent) },
      { path: 'orders/:id', loadComponent: () => import('./orders/order-detail-page').then((m) => m.OrderDetailPageComponent) },
      { path: 'reviews', canActivate: [permissionGuard('review:moderate')], loadComponent: () => import('./pages/reviews-page').then((m) => m.ReviewsPageComponent) },
      { path: 'coupons', canActivate: [permissionGuard('coupon:write')], loadComponent: () => import('./pages/coupons-page').then((m) => m.CouponsPageComponent) },
      { path: 'users', canActivate: [permissionGuard('user:read')], loadComponent: () => import('./pages/users-page').then((m) => m.UsersPageComponent) },
      { path: 'audit', canActivate: [permissionGuard('user:read')], loadComponent: () => import('./pages/audit-page').then((m) => m.AuditPageComponent) },
      { path: 'settings', canActivate: [permissionGuard('user:read')], loadComponent: () => import('./pages/settings-page').then((m) => m.SettingsPageComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
