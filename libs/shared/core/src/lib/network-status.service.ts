import { Injectable, OnDestroy, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Tracks whether the browser currently has a network connection, for an offline banner. */
@Injectable({ providedIn: 'root' })
export class NetworkStatusService implements OnDestroy {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly _online = signal(this.browser ? navigator.onLine : true);
  readonly online = this._online.asReadonly();

  /** True when the page on screen came from the service worker's saved copy (BRD 18, LX-05), so prices and stock may be old. Stays true until the page is reloaded. */
  private readonly _savedCopy = signal(false);
  readonly savedCopy = this._savedCopy.asReadonly();

  private readonly goOnline = () => this._online.set(true);
  private readonly goOffline = () => this._online.set(false);

  constructor() {
    if (!this.browser) return;
    window.addEventListener('online', this.goOnline);
    window.addEventListener('offline', this.goOffline);
    // A page the service worker answered from its saved copies carries a marker tag (see apps/storefront/public/sw.js).
    if (document.querySelector('meta[name="sw-saved-copy"]')) this._savedCopy.set(true);
  }

  ngOnDestroy(): void {
    if (!this.browser) return;
    window.removeEventListener('online', this.goOnline);
    window.removeEventListener('offline', this.goOffline);
  }
}
