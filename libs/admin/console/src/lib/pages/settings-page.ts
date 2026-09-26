import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { APP_CONFIG, SeoService } from '@ecom/shared/core';
import { COD_MAX_TOTAL, FREE_SHIPPING_THRESHOLD, MAX_LINE_QUANTITY } from '@ecom/shared/data-access';
import { MoneyPipe } from '@ecom/shared/util';

/** Read-only view of how the store is configured (editing settings arrives with the real backend). */
@Component({
  selector: 'adm-settings',
  imports: [MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-1 text-2xl font-bold">Settings</h1>
    <p class="mb-4 text-sm text-text-muted">Read only. Changing these values needs the backend configuration service.</p>
    <div class="grid gap-6 md:grid-cols-2">
      <section class="rounded-lg border border-border p-4" aria-labelledby="g"><h2 id="g" class="mb-2 font-semibold">Store</h2>
        <dl class="space-y-1 text-sm"><div class="flex justify-between"><dt>Name</dt><dd>{{ config.siteName }}</dd></div><div class="flex justify-between"><dt>Currency</dt><dd>INR (₹)</dd></div><div class="flex justify-between"><dt>Data source</dt><dd>{{ config.useMocks ? 'Mock adapters' : 'Live API' }}</dd></div></dl></section>
      <section class="rounded-lg border border-border p-4" aria-labelledby="t"><h2 id="t" class="mb-2 font-semibold">Tax (GST included in prices)</h2>
        <dl class="space-y-1 text-sm"><div class="flex justify-between"><dt>Grocery</dt><dd>5%</dd></div><div class="flex justify-between"><dt>Books</dt><dd>0%</dd></div><div class="flex justify-between"><dt>Fashion</dt><dd>12%</dd></div><div class="flex justify-between"><dt>Everything else</dt><dd>18%</dd></div></dl></section>
      <section class="rounded-lg border border-border p-4" aria-labelledby="s"><h2 id="s" class="mb-2 font-semibold">Shipping</h2>
        <dl class="space-y-1 text-sm"><div class="flex justify-between"><dt>Standard</dt><dd>₹49, free from {{ { amount: freeShipping, currency: 'INR' } | money }}</dd></div><div class="flex justify-between"><dt>Express</dt><dd>₹99</dd></div><div class="flex justify-between"><dt>Max quantity per item</dt><dd>{{ maxQty }}</dd></div></dl></section>
      <section class="rounded-lg border border-border p-4" aria-labelledby="p"><h2 id="p" class="mb-2 font-semibold">Payments</h2>
        <dl class="space-y-1 text-sm"><div class="flex justify-between"><dt>Online</dt><dd>Razorpay (test mode)</dd></div><div class="flex justify-between"><dt>Cash on delivery</dt><dd>Up to {{ { amount: codMax, currency: 'INR' } | money }}</dd></div></dl></section>
    </div>
  `,
})
export class SettingsPageComponent {
  protected readonly config = inject(APP_CONFIG);
  protected readonly freeShipping = FREE_SHIPPING_THRESHOLD;
  protected readonly codMax = COD_MAX_TOTAL;
  protected readonly maxQty = MAX_LINE_QUANTITY;

  constructor() {
    inject(SeoService).set({ title: 'Settings', noindex: true });
  }
}
