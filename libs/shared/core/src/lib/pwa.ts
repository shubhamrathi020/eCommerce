import { isPlatformBrowser } from '@angular/common';
import { EnvironmentProviders, PLATFORM_ID, inject, isDevMode, makeEnvironmentProviders, provideEnvironmentInitializer } from '@angular/core';

/**
 * Registers the shop's service worker (`/sw.js`, BRD 18 LX-05) once the page has loaded. Production builds only: in development a
 * service worker would hide edits behind its caches. Safe where service workers do not exist (older browsers, private windows).
 * The worker's own rules decide what may be kept; see apps/storefront/public/sw.js.
 */
export function provideShopServiceWorker(options: { script?: string; enabled?: boolean } = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      const enabled = options.enabled ?? !isDevMode();
      if (!enabled || !isPlatformBrowser(inject(PLATFORM_ID)) || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
      const register = () => void navigator.serviceWorker.register(options.script ?? '/sw.js', { scope: '/' }).catch(() => undefined);
      if (document.readyState === 'complete') register();
      else window.addEventListener('load', register, { once: true });
    }),
  ]);
}
