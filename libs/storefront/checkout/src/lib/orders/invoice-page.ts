import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LocaleDatePipe, SeoService } from '@ecom/shared/core';
import { OrderApi } from '@ecom/shared/data-access';
import type { Order } from '@ecom/shared/models';
import { ButtonComponent, NotFoundComponent, SkeletonComponent } from '@ecom/shared/ui';
import { MoneyPipe } from '@ecom/shared/util';

/** Printable tax invoice (use the browser's "Save as PDF"). The site header and footer are hidden when printing. */
@Component({
  selector: 'app-invoice-page',
  imports: [LocaleDatePipe, RouterLink, MoneyPipe, ButtonComponent, NotFoundComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (order(); as o) {
      <div class="mb-4 flex gap-2 print:hidden">
        <button uiButton type="button" (click)="print()">Print / Save as PDF</button>
        <a uiButton variant="secondary" [routerLink]="['/orders', o.id]">Back to order</a>
      </div>
      <article class="mx-auto max-w-3xl rounded-lg border border-border bg-surface p-6 print:border-0 print:p-0" aria-label="Tax invoice">
        <header class="flex flex-wrap justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 class="text-2xl font-bold">Tax Invoice</h1>
            <p class="text-sm text-text-muted">Shop (demo seller) · GSTIN 29ABCDE1234F1Z5 (sample)</p>
          </div>
          <dl class="text-sm">
            <div class="flex gap-2"><dt class="text-text-muted">Invoice no.</dt><dd>INV-{{ o.id }}</dd></div>
            <div class="flex gap-2"><dt class="text-text-muted">Date</dt><dd>{{ o.createdAt | date: 'd MMM y' }}</dd></div>
            <div class="flex gap-2"><dt class="text-text-muted">Payment</dt><dd>{{ o.paymentMethod === 'cod' ? 'Cash on delivery' : 'Online' }}</dd></div>
          </dl>
        </header>
        <section class="py-4 text-sm" aria-label="Bill to">
          <h2 class="font-semibold">Bill to</h2>
          <p>{{ o.contact.name }} · {{ o.contact.email }} · {{ o.contact.phone }}</p>
          <p class="text-text-muted">{{ o.address.line1 }}{{ o.address.line2 ? ', ' + o.address.line2 : '' }}, {{ o.address.city }}, {{ o.address.state }} {{ o.address.pincode }}</p>
        </section>
        <table class="w-full text-start text-sm">
          <caption class="sr-only">Invoice items</caption>
          <thead>
            <tr class="border-y border-border">
              <th scope="col" class="py-2">Item</th>
              <th scope="col" class="py-2 text-end">Qty</th>
              <th scope="col" class="py-2 text-end">Unit price</th>
              <th scope="col" class="py-2 text-end">GST incl.</th>
              <th scope="col" class="py-2 text-end">Amount</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            @for (line of o.lines; track line.variantId) {
              <tr>
                <td class="py-2">{{ line.title }}<span class="block text-text-muted">{{ line.brandName }}</span></td>
                <td class="py-2 text-end">{{ line.quantity }}</td>
                <td class="py-2 text-end">{{ line.unitPrice | money }}</td>
                <td class="py-2 text-end">{{ line.taxIncluded | money }}</td>
                <td class="py-2 text-end">{{ line.lineTotal | money }}</td>
              </tr>
            }
          </tbody>
        </table>
        <dl class="ms-auto mt-4 w-full max-w-xs space-y-1 text-sm">
          <div class="flex justify-between"><dt>Subtotal</dt><dd>{{ o.totals.subtotal | money }}</dd></div>
          @for (offer of o.promotions ?? []; track offer.promotionId) {
            <div class="flex justify-between"><dt>{{ offer.name }}</dt><dd>−{{ offer.amount | money }}</dd></div>
          }
          @if (o.totals.couponDiscount.amount > 0) {
            <div class="flex justify-between"><dt>Coupon {{ o.couponCode }}</dt><dd>−{{ o.totals.couponDiscount | money }}</dd></div>
          }
          <div class="flex justify-between"><dt>Shipping</dt><dd>{{ o.totals.shipping.amount === 0 ? 'Free' : (o.totals.shipping | money) }}</dd></div>
          @if (o.totals.giftCardApplied; as gift) {
            <div class="flex justify-between"><dt>Paid with gift card</dt><dd>−{{ gift | money }}</dd></div>
          }
          @if (o.totals.creditApplied; as credit) {
            <div class="flex justify-between"><dt>Paid with store credit</dt><dd>−{{ credit | money }}</dd></div>
          }
          <div class="flex justify-between border-t border-border pt-1 text-base font-semibold"><dt>{{ o.tender ? 'Amount due' : 'Total' }}</dt><dd>{{ o.totals.total | money }}</dd></div>
          <div class="flex justify-between text-text-muted"><dt>GST included in total</dt><dd>{{ o.totals.taxIncluded | money }}</dd></div>
        </dl>
        <p class="mt-6 text-xs text-text-muted">This is a system generated demo invoice.</p>
      </article>
    } @else if (resource.status() === 'error') {
      <ui-not-found />
    } @else {
      <ui-skeleton class="h-64" />
    }
  `,
})
export class InvoicePageComponent {
  readonly id = input.required<string>();
  private readonly api = inject(OrderApi);
  protected readonly resource = rxResource({ params: () => this.id(), stream: ({ params }) => this.api.get(params) });
  protected readonly order = computed<Order | undefined>(() => (this.resource.hasValue() ? this.resource.value() : undefined));

  constructor() {
    inject(SeoService).set({ title: 'Invoice', noindex: true });
  }

  protected print(): void {
    window.print();
  }
}
