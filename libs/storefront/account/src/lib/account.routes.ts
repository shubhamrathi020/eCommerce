import { isDevMode } from '@angular/core';
import type { Route } from '@angular/router';
import { authGuard, guestOnlyGuard } from '@ecom/shared/state';

/** Account, sign-in and wishlist routes (all lazy). The demo mailbox exists only in development builds. */
export const accountRoutes: Route[] = [
  { path: 'account/login', canActivate: [guestOnlyGuard], loadComponent: () => import('./auth/login-page').then((m) => m.LoginPageComponent) },
  { path: 'account/register', canActivate: [guestOnlyGuard], loadComponent: () => import('./auth/register-page').then((m) => m.RegisterPageComponent) },
  { path: 'account/forgot-password', loadComponent: () => import('./auth/recovery-pages').then((m) => m.ForgotPasswordPageComponent) },
  { path: 'account/reset-password', loadComponent: () => import('./auth/recovery-pages').then((m) => m.ResetPasswordPageComponent) },
  { path: 'account/verify-email', loadComponent: () => import('./auth/recovery-pages').then((m) => m.VerifyEmailPageComponent) },
  { path: 'account', canActivate: [authGuard], loadComponent: () => import('./pages/account-home').then((m) => m.AccountHomeComponent) },
  { path: 'account/profile', canActivate: [authGuard], loadComponent: () => import('./pages/profile-page').then((m) => m.ProfilePageComponent) },
  { path: 'account/addresses', canActivate: [authGuard], loadComponent: () => import('./pages/addresses-page').then((m) => m.AddressesPageComponent) },
  { path: 'account/privacy', canActivate: [authGuard], loadComponent: () => import('./pages/privacy-page').then((m) => m.PrivacyPageComponent) },
  { path: 'account/preferences', canActivate: [authGuard], loadComponent: () => import('./pages/preferences-page').then((m) => m.PreferencesPageComponent) },
  { path: 'account/alerts', canActivate: [authGuard], loadComponent: () => import('./pages/alerts-page').then((m) => m.AlertsPageComponent) },
  { path: 'account/returns', canActivate: [authGuard], loadComponent: () => import('./returns/returns-list-page').then((m) => m.ReturnsListPageComponent) },
  { path: 'account/returns/new', canActivate: [authGuard], loadComponent: () => import('./returns/return-request-page').then((m) => m.ReturnRequestPageComponent) },
  { path: 'account/returns/:id', canActivate: [authGuard], loadComponent: () => import('./returns/return-detail-page').then((m) => m.ReturnDetailPageComponent) },
  { path: 'account/support', canActivate: [authGuard], loadComponent: () => import('./returns/support-pages').then((m) => m.SupportListPageComponent) },
  { path: 'account/support/new', canActivate: [authGuard], loadComponent: () => import('./returns/support-pages').then((m) => m.SupportNewPageComponent) },
  { path: 'account/support/:id', canActivate: [authGuard], loadComponent: () => import('./returns/support-pages').then((m) => m.SupportDetailPageComponent) },
  { path: 'notifications', canActivate: [authGuard], loadComponent: () => import('./pages/notifications-page').then((m) => m.NotificationsPageComponent) },
  { path: 'unsubscribe', loadComponent: () => import('./pages/unsubscribe-page').then((m) => m.UnsubscribePageComponent) },
  { path: 'wishlist', loadComponent: () => import('./pages/wishlist-page').then((m) => m.WishlistPageComponent) },
  ...(isDevMode() ? [{ path: 'dev/mailbox', loadComponent: () => import('./pages/mailbox-page').then((m) => m.MailboxPageComponent) }] : []),
];
