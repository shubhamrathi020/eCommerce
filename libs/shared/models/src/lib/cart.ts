import type { ImageRef } from './catalog';
import type { Money } from './money';

export type ShippingMethodId = 'standard' | 'express';

export type CartLineIssue = 'out_of_stock' | 'quantity_reduced' | 'price_changed';

export interface CartLine {
  productId: string;
  variantId: string;
  slug: string;
  title: string;
  brandName: string;
  image: ImageRef;
  options: Record<string, string>;
  unitPrice: Money;
  mrp?: Money;
  quantity: number;
  /** min(10, stock) */
  maxQuantity: number;
  lineTotal: Money;
  /** GST included in `lineTotal`. */
  taxIncluded: Money;
  issue?: CartLineIssue;
  /** Present when `issue` is `price_changed`. */
  previousUnitPrice?: Money;
}

export interface AppliedCoupon {
  code: string;
  description: string;
  discount: Money;
  freeShipping: boolean;
}

export interface CartTotals {
  itemCount: number;
  /** Sum of selling prices. */
  subtotal: Money;
  /** Total saved versus MRP. */
  mrpSavings: Money;
  couponDiscount: Money;
  shipping: Money;
  taxIncluded: Money;
  total: Money;
  /** How much more to spend for free standard shipping; absent once free. */
  amountToFreeShipping?: Money;
}

export interface Cart {
  lines: CartLine[];
  coupon?: AppliedCoupon;
  shippingMethod: ShippingMethodId;
  totals: CartTotals;
  /** Human-readable notices from validation (price changes, reduced quantities). */
  notices: string[];
  /** True when at least one line blocks checkout (e.g. out of stock). */
  blocked: boolean;
}

export interface ShippingOption {
  id: ShippingMethodId;
  label: string;
  price: Money;
  estimatedDays: number;
  /** ISO date. */
  estimatedDate: string;
}

export type PaymentMethod = 'razorpay' | 'cod';

export interface PaymentOption {
  method: PaymentMethod;
  label: string;
  enabled: boolean;
  /** Why the option is unavailable. */
  reason?: string;
}
