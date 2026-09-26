import { Injectable, inject } from '@angular/core';
import type { PaymentOption, ShippingOption } from '@ecom/shared/models';
import { ApiException } from '@ecom/shared/models';
import { CheckoutApi } from '../lib/commerce.api';
import { computeServiceability } from './catalog-data';
import { COD_MAX_TOTAL, EXPRESS_SHIPPING, shippingFee } from './cart-engine';
import { MockCartState } from './mock-cart-state';
import { createMockResponder } from './mock-latency';

const DAY_MS = 86_400_000;
const PINCODE = /^[1-9][0-9]{5}$/;
/** Mock rule: no cash on delivery for these pin-code prefixes. */
const COD_BLOCKED_PREFIXES = ['7', '8'];

export function validateDeliverable(pincode: string): void {
  if (!PINCODE.test(pincode)) throw new ApiException('validation', 'Enter a valid 6-digit pin code', { pincode: 'Invalid pin code' });
  if (!computeServiceability(pincode).serviceable) throw new ApiException('validation', 'Sorry, we do not deliver to this pin code yet.', { pincode: 'Not deliverable' });
}

export function codEligibility(pincode: string, total: number): { enabled: boolean; reason?: string } {
  if (total > COD_MAX_TOTAL) return { enabled: false, reason: 'Cash on delivery is available for orders up to ₹5,000.' };
  if (COD_BLOCKED_PREFIXES.includes(pincode[0])) return { enabled: false, reason: 'Cash on delivery is not available for this pin code.' };
  return { enabled: true };
}

@Injectable()
export class MockCheckoutApi extends CheckoutApi {
  private readonly respond = createMockResponder();
  private readonly state = inject(MockCartState);

  shippingOptions(pincode: string) {
    return this.respond.okAsync<ShippingOption[]>(async () => {
      validateDeliverable(pincode);
      const { cart } = await this.state.priced();
      const base = computeServiceability(pincode);
      const afterDiscount = cart.totals.subtotal.amount - cart.totals.couponDiscount.amount;
      const free = cart.coupon?.freeShipping ?? false;
      const standardDays = base.estimatedDays ?? 3;
      const expressDays = Math.max(1, standardDays - 2);
      const on = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();
      return [
        { id: 'standard', label: 'Standard delivery', price: { amount: shippingFee('standard', afterDiscount, free), currency: 'INR' }, estimatedDays: standardDays, estimatedDate: on(standardDays) },
        { id: 'express', label: 'Express delivery', price: { amount: free ? 0 : EXPRESS_SHIPPING, currency: 'INR' }, estimatedDays: expressDays, estimatedDate: on(expressDays) },
      ];
    });
  }

  paymentOptions(pincode: string) {
    return this.respond.okAsync<PaymentOption[]>(async () => {
      validateDeliverable(pincode);
      const { cart } = await this.state.priced();
      const cod = codEligibility(pincode, cart.totals.total.amount);
      return [
        { method: 'razorpay', label: 'Pay online (UPI, cards, net banking, wallets)', enabled: true },
        { method: 'cod', label: 'Cash on delivery', enabled: cod.enabled, ...(cod.reason ? { reason: cod.reason } : {}) },
      ];
    });
  }
}
