import { Injectable, signal } from '@angular/core';

/** Placeholder until the cart module (BRD 04) provides the real count. Always 0 for now. */
@Injectable({ providedIn: 'root' })
export class CartBadgeStore {
  readonly count = signal(0).asReadonly();
}
