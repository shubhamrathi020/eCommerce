import { ApplicationRef, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Whether the app has finished its first stable render on the client. `false` on the server and for
 * every render until then — including the very first HTML the server sends, so a submit button that
 * reads this is genuinely `disabled` from the first byte, not just once some client script runs. There
 * is no safe way to "catch" a form submitted natively before any JavaScript has attached to it; disabling
 * the button until then is what actually prevents it (see BRD 12, FH-06).
 */
@Injectable({ providedIn: 'root' })
export class AppReadyService {
  private readonly _ready = signal(false);
  readonly ready = computed(() => this._ready());

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    // `isStable` can emit synchronously (already stable) during `subscribe()` itself, before a variable
    // holding the subscription would exist to unsubscribe from — so this never bothers to unsubscribe;
    // it only ever needs the first `true` and setting a signal to the value it already has is a no-op.
    inject(ApplicationRef).isStable.subscribe((stable) => {
      if (stable) this._ready.set(true);
    });
  }
}
