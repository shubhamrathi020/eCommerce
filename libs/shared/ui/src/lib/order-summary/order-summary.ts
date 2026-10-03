import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { AppliedCoupon, AppliedPromotion, CartTotals } from '@ecom/contracts';
import { MoneyPipe } from '@ecom/shared/util';
import { TranslatePipe } from '@ecom/shared/core';

/** Price breakdown for a cart or an order. All figures come from the server; nothing is computed here. */
@Component({
  selector: 'ui-order-summary',
  imports: [MoneyPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <dl class="space-y-2 text-sm">
      <div class="flex justify-between">
        <dt>{{ 'summary.items' | t: { count: totals().itemCount } }}</dt>
        <dd>{{ totals().subtotal | money }}</dd>
      </div>
      @if (totals().mrpSavings.amount > 0) {
        <div class="flex justify-between text-success">
          <dt>{{ 'summary.mrpSavings' | t }}</dt>
          <dd>{{ totals().mrpSavings | money }}</dd>
        </div>
      }
      @for (offer of promotions() ?? []; track offer.promotionId) {
        <div class="flex justify-between gap-3 text-success">
          <dt>{{ offer.name }}<span class="block text-xs text-text-muted">{{ offer.label }}</span></dt>
          <dd class="shrink-0">−{{ offer.amount | money }}</dd>
        </div>
      } @empty {
        @if (totals().promotionDiscount; as offers) {
          <div class="flex justify-between text-success">
            <dt>{{ 'summary.offers' | t }}</dt>
            <dd>−{{ offers | money }}</dd>
          </div>
        }
      }
      @if (coupon(); as c) {
        <div class="flex justify-between text-success">
          <dt>{{ 'summary.coupon' | t: { code: c.code } }}</dt>
          <dd>−{{ totals().couponDiscount | money }}</dd>
        </div>
      }
      <div class="flex justify-between">
        <dt>{{ 'summary.shipping' | t }}</dt>
        <dd>{{ totals().shipping.amount === 0 ? ('summary.free' | t) : (totals().shipping | money) }}</dd>
      </div>
      @if (totals().giftCardApplied; as gift) {
        <div class="flex justify-between text-success">
          <dt>{{ 'summary.giftCard' | t }}</dt>
          <dd>−{{ gift | money }}</dd>
        </div>
      }
      @if (totals().creditApplied; as credit) {
        <div class="flex justify-between text-success">
          <dt>{{ 'summary.credit' | t }}</dt>
          <dd>−{{ credit | money }}</dd>
        </div>
      }
      <div class="flex justify-between border-t border-border pt-2 text-base font-semibold">
        <dt>{{ totals().giftCardApplied || totals().creditApplied ? ('summary.toPay' | t) : ('summary.total' | t) }}</dt>
        <dd>{{ totals().total | money }}</dd>
      </div>
      <div class="flex justify-between text-xs text-text-muted">
        <dt>{{ 'summary.gst' | t }}</dt>
        <dd>{{ totals().taxIncluded | money }}</dd>
      </div>
    </dl>
  `,
})
export class OrderSummaryComponent {
  readonly totals = input.required<CartTotals>();
  readonly coupon = input<AppliedCoupon | undefined>();
  /** Each automatic offer as its own line (BRD 14). */
  readonly promotions = input<AppliedPromotion[] | undefined>();
}
