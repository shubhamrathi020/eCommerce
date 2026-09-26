import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, type CanActivateFn, type Route } from '@angular/router';
import { CartStore } from '@ecom/shared/state';

/** Sends shoppers with an empty cart back to the cart page. The cart is browser-only, so the server lets the request through. */
export const cartNotEmptyGuard: CanActivateFn = async () => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;
  // Inject before awaiting: the injection context is gone afterwards.
  const store = inject(CartStore);
  const router = inject(Router);
  await store.refresh();
  return store.isEmpty() ? router.createUrlTree(['/cart']) : true;
};

/** Cart, checkout and order routes. Each page is lazy-loaded. */
export const checkoutRoutes: Route[] = [
  { path: 'cart', loadComponent: () => import('./cart/cart-page').then((m) => m.CartPageComponent) },
  { path: 'checkout', canActivate: [cartNotEmptyGuard], loadComponent: () => import('./checkout/checkout-page').then((m) => m.CheckoutPageComponent) },
  { path: 'orders', loadComponent: () => import('./orders/orders-list-page').then((m) => m.OrdersListPageComponent) },
  { path: 'orders/:id', loadComponent: () => import('./orders/order-page').then((m) => m.OrderPageComponent) },
  { path: 'orders/:id/invoice', loadComponent: () => import('./orders/invoice-page').then((m) => m.InvoicePageComponent) },
];
