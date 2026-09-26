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
      {
        path: 'content',
        canActivate: [permissionGuard('content:write')],
        loadComponent: () => import('./content/content-layout').then((m) => m.ContentLayoutComponent),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'banners' },
          { path: 'banners', loadComponent: () => import('./content/banners-page').then((m) => m.BannersPageComponent) },
          { path: 'sections', loadComponent: () => import('./content/sections-page').then((m) => m.SectionsPageComponent) },
          { path: 'pages', loadComponent: () => import('./content/pages-page').then((m) => m.PagesPageComponent) },
          { path: 'links', loadComponent: () => import('./content/links-page').then((m) => m.LinksPageComponent) },
          { path: 'redirects', loadComponent: () => import('./content/redirects-page').then((m) => m.RedirectsPageComponent) },
        ],
      },
      { path: 'reviews', canActivate: [permissionGuard('review:moderate')], loadComponent: () => import('./pages/reviews-page').then((m) => m.ReviewsPageComponent) },
      { path: 'coupons', canActivate: [permissionGuard('coupon:write')], loadComponent: () => import('./pages/coupons-page').then((m) => m.CouponsPageComponent) },
      { path: 'users', canActivate: [permissionGuard('user:read')], loadComponent: () => import('./pages/users-page').then((m) => m.UsersPageComponent) },
      { path: 'audit', canActivate: [permissionGuard('user:read')], loadComponent: () => import('./pages/audit-page').then((m) => m.AuditPageComponent) },
      { path: 'settings', canActivate: [permissionGuard('user:read')], loadComponent: () => import('./pages/settings-page').then((m) => m.SettingsPageComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
