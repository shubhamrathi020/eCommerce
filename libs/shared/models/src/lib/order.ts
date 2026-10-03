import type { AppliedPromotion } from './promotions';
import type { CartLine, CartTotals, PaymentMethod, ShippingMethodId } from './cart';

export interface ContactDetails {
  name: string;
  email: string;
  phone: string;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export type OrderStatus = 'pending_payment' | 'confirmed' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cod' | 'refund_pending';

export interface TimelineEntry {
  status: OrderStatus | 'placed' | 'paid';
  label: string;
  /** ISO time; absent for steps that have not happened yet. */
  at?: string;
}

export interface Order {
  id: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  lines: CartLine[];
  totals: CartTotals;
  couponCode?: string;
  promotions?: AppliedPromotion[];
  /** What a gift card and store credit paid; refunds of such orders go back as store credit. */
  tender?: { giftCard?: { code: string; amount: number }; storeCredit?: number; refundedAt?: string };
  shippingMethod: ShippingMethodId;
  contact: ContactDetails;
  address: Address;
  timeline: TimelineEntry[];
  createdAt: string;
  /** Set when a signed-in customer placed the order. */
  userId?: string;
}

export interface PlaceOrderRequest {
  /** Client-generated key: retrying with the same key never creates a second order. */
  idempotencyKey: string;
  contact: ContactDetails;
  address: Address;
  paymentMethod: PaymentMethod;
}

/** Data the payment provider window needs. Only public identifiers; amounts come from the server. */
export interface PaymentSession {
  orderId: string;
  providerOrderId: string;
  keyId: string;
  /** Minor units. */
  amount: number;
  currency: 'INR';
}

export interface PaymentResult {
  providerPaymentId: string;
  providerOrderId: string;
  signature: string;
}
