import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthStore } from './auth.store';

/**
 * Account pages need a signed-in user; others go to sign in with a `returnUrl`.
 * This is a UX convenience only: the backend must enforce access on every request.
 * The session lives in the browser, so the server render lets the request through and the client re-checks.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;
  // Inject before awaiting: the injection context is gone afterwards.
  const auth = inject(AuthStore);
  const router = inject(Router);
  await auth.init();
  return auth.loggedIn() ? true : router.createUrlTree(['/account/login'], { queryParams: { returnUrl: state.url } });
};

/** Sign in and register pages are for signed-out visitors only. */
export const guestOnlyGuard: CanActivateFn = async () => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;
  const auth = inject(AuthStore);
  const router = inject(Router);
  await auth.init();
  return auth.loggedIn() ? router.createUrlTree(['/account']) : true;
};

/** Requires a permission such as `product:write` (used by the admin app). */
export function permissionGuard(permission: string): CanActivateFn {
  return async () => {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;
    const auth = inject(AuthStore);
    const router = inject(Router);
    await auth.init();
    return auth.hasPermission(permission) ? true : router.createUrlTree(['/account/login']);
  };
}
