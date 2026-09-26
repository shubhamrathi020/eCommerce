import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { AppliedCoupon, CartTotals } from '@ecom/shared/models';
import { MoneyPipe } from '@ecom/shared/util';

/** Price breakdown for a cart or an order. All figures come from the server; nothing is computed here. */
@Component({
  selector: 'ui-order-summary',
  imports: [MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <dl class="space-y-2 text-sm">
      <div class="flex justify-between">
        <dt>Items ({{ totals().itemCount }})</dt>
        <dd>{{ totals().subtotal | money }}</dd>
      </div>
      @if (totals().mrpSavings.amount > 0) {
        <div class="flex justify-between text-success">
          <dt>You save on MRP</dt>
          <dd>{{ totals().mrpSavings | money }}</dd>
        </div>
      }
      @if (coupon(); as c) {
        <div class="flex justify-between text-success">
          <dt>Coupon {{ c.code }}</dt>
          <dd>−{{ totals().couponDiscount | money }}</dd>
        </div>
      }
      <div class="flex justify-between">
        <dt>Shipping</dt>
        <dd>{{ totals().shipping.amount === 0 ? 'Free' : (totals().shipping | money) }}</dd>
      </div>
      <div class="flex justify-between border-t border-border pt-2 text-base font-semibold">
        <dt>Total</dt>
        <dd>{{ totals().total | money }}</dd>
      </div>
      <div class="flex justify-between text-xs text-text-muted">
        <dt>Includes GST</dt>
        <dd>{{ totals().taxIncluded | money }}</dd>
      </div>
    </dl>
  `,
})
export class OrderSummaryComponent {
  readonly totals = input.required<CartTotals>();
  readonly coupon = input<AppliedCoupon | undefined>();
}
