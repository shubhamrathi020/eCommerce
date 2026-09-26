import { Injectable, signal } from '@angular/core';
import type { PaymentResult, PaymentSession } from '@ecom/shared/models';
import { mockSignature } from '@ecom/shared/data-access';

export type PaymentOutcome = { status: 'success'; result: PaymentResult } | { status: 'failed'; reason: string } | { status: 'dismissed' };

/**
 * Opens the payment provider's window. The real Razorpay adapter will load their checkout script and
 * resolve with the same outcome shape; the checkout page does not change.
 */
export abstract class PaymentLauncher {
  abstract open(session: PaymentSession): Promise<PaymentOutcome>;
}

/** Test-mode stand-in: shows an in-page dialog instead of Razorpay. No card data is ever collected. */
@Injectable({ providedIn: 'root' })
export class MockPaymentLauncher extends PaymentLauncher {
  /** Read by `MockRazorpayComponent`. */
  readonly pending = signal<{ session: PaymentSession; resolve: (outcome: PaymentOutcome) => void } | null>(null);

  open(session: PaymentSession): Promise<PaymentOutcome> {
    return new Promise((resolve) => this.pending.set({ session, resolve }));
  }

  succeed(): void {
    const p = this.pending();
    if (!p) return;
    const providerPaymentId = `pay_mock_${Date.now().toString(36)}`;
    this.finish({ status: 'success', result: { providerOrderId: p.session.providerOrderId, providerPaymentId, signature: mockSignature(p.session.providerOrderId, providerPaymentId) } });
  }

  fail(): void {
    this.finish({ status: 'failed', reason: 'Payment declined in test mode' });
  }

  dismiss(): void {
    this.finish({ status: 'dismissed' });
  }

  private finish(outcome: PaymentOutcome): void {
    const p = this.pending();
    this.pending.set(null);
    p?.resolve(outcome);
  }
}
