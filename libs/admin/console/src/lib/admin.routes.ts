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
      {
        path: 'inventory',
        canActivate: [permissionGuard('inventory:write')],
        loadComponent: () => import('./inventory/inventory-layout').then((m) => m.InventoryLayoutComponent),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'stock' },
          { path: 'stock', loadComponent: () => import('./inventory/stock-page').then((m) => m.StockPageComponent) },
          { path: 'ledger', loadComponent: () => import('./inventory/ledger-page').then((m) => m.LedgerPageComponent) },
          { path: 'import', loadComponent: () => import('./inventory/import-page').then((m) => m.ImportPageComponent) },
          { path: 'settings', loadComponent: () => import('./inventory/settings-page').then((m) => m.SettingsPageComponent) },
        ],
      },
      {
        path: 'returns',
        canActivate: [permissionGuard('return:manage')],
        loadComponent: () => import('./returns/returns-layout').then((m) => m.ReturnsLayoutComponent),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'queue' },
          { path: 'queue', loadComponent: () => import('./returns/queue-page').then((m) => m.ReturnsQueuePageComponent) },
          { path: 'queue/:id', loadComponent: () => import('./returns/return-detail-page').then((m) => m.ReturnDetailPageComponent) },
          { path: 'refunds', canActivate: [permissionGuard('order:refund')], loadComponent: () => import('./returns/refunds-page').then((m) => m.RefundsPageComponent) },
          { path: 'policy', loadComponent: () => import('./returns/policy-page').then((m) => m.PolicyPageComponent) },
        ],
      },
      {
        path: 'promotions',
        canActivate: [permissionGuard('promotion:manage')],
        loadComponent: () => import('./promotions/promotions-layout').then((m) => m.PromotionsLayoutComponent),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'list' },
          { path: 'list', loadComponent: () => import('./promotions/promotions-page').then((m) => m.PromotionsPageComponent) },
          { path: 'list/new', loadComponent: () => import('./promotions/promotion-form-page').then((m) => m.PromotionFormPageComponent) },
          { path: 'list/:id', loadComponent: () => import('./promotions/promotion-form-page').then((m) => m.PromotionFormPageComponent) },
          { path: 'simulator', loadComponent: () => import('./promotions/simulator-page').then((m) => m.SimulatorPageComponent) },
          { path: 'gift-cards', loadComponent: () => import('./promotions/gift-cards-page').then((m) => m.GiftCardsPageComponent) },
          { path: 'price-health', loadComponent: () => import('./promotions/price-health-page').then((m) => m.PriceHealthPageComponent) },
        ],
      },
      { path: 'support', canActivate: [permissionGuard('support:manage')], loadComponent: () => import('./support/support-pages').then((m) => m.SupportQueuePageComponent) },
      { path: 'support/:id', canActivate: [permissionGuard('support:manage')], loadComponent: () => import('./support/support-pages').then((m) => m.SupportDetailPageComponent) },
      {
        path: 'notifications',
        canActivate: [permissionGuard('notification:manage')],
        loadComponent: () => import('./notifications/notifications-layout').then((m) => m.NotificationsLayoutComponent),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'templates' },
          { path: 'templates', loadComponent: () => import('./notifications/templates-page').then((m) => m.TemplatesPageComponent) },
          { path: 'log', loadComponent: () => import('./notifications/delivery-log-page').then((m) => m.DeliveryLogPageComponent) },
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
