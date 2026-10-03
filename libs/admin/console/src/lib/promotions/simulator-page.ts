import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map, switchMap } from 'rxjs';
import { SeoService } from '@ecom/shared/core';
import { AdminPromotionApi, CatalogApi } from '@ecom/shared/data-access';
import { ApiException, type SimulationResult } from '@ecom/contracts';
import { MoneyPipe, formatMoney } from '@ecom/shared/util';
import { BadgeComponent, ButtonComponent, FormFieldComponent, InputDirective, SkeletonComponent } from '@ecom/shared/ui';

interface Row {
  key: number;
  variantId: string;
  quantity: string;
}

let nextKey = 0;

/** Promotion simulator (PE-06): run a sample cart through the real engine and see which rules fire and why. Changes nothing. */
@Component({
  selector: 'adm-promotion-simulator',
  imports: [MoneyPipe, BadgeComponent, ButtonComponent, FormFieldComponent, InputDirective, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="mb-4 max-w-2xl text-sm text-text-muted">Build a sample cart and press Run. The result uses exactly the same rules a shopper's cart uses, at the time you choose. No stock, order or deal counter is touched.</p>
    @if (options.hasValue() || rows().length > 0) {
      <form class="max-w-3xl space-y-4" (submit)="run($event)" novalidate>
        <ui-form-field #sf="uiFormField" label="Find products" hint="Type part of a product name to change the choices below"><input uiInput type="search" [id]="sf.id" [attr.aria-describedby]="sf.describedBy()" (input)="search.set($any($event.target).value)" /></ui-form-field>
        <fieldset class="space-y-2">
          <legend class="mb-1 text-sm font-medium">Sample cart</legend>
          @for (row of rows(); track row.key; let i = $index) {
            <div class="flex flex-wrap items-end gap-2">
              <div class="min-w-0 flex-1">
                <label [attr.for]="'sv' + row.key" class="mb-1 block text-sm">Item {{ i + 1 }}</label>
                <select uiInput [id]="'sv' + row.key" (change)="setVariant(row.key, $any($event.target).value)">
                  @for (o of choices(); track o.variantId) {
                    <option [value]="o.variantId" [selected]="o.variantId === row.variantId">{{ o.label }}</option>
                  }
                </select>
              </div>
              <div class="w-24">
                <label [attr.for]="'sq' + row.key" class="mb-1 block text-sm">Quantity</label>
                <input uiInput inputmode="numeric" [id]="'sq' + row.key" [value]="row.quantity" (input)="setQuantity(row.key, $any($event.target).value)" />
              </div>
              <button uiButton variant="ghost" type="button" [disabled]="rows().length === 1" (click)="removeRow(row.key)">Remove<span class="sr-only"> item {{ i + 1 }}</span></button>
            </div>
          }
          <button uiButton variant="secondary" size="sm" type="button" (click)="addRow()">Add another item</button>
          @if (errors()['items']) {
            <p class="text-sm text-danger" role="alert">{{ errors()['items'] }}</p>
          }
        </fieldset>
        <div class="grid gap-3 sm:grid-cols-3">
          <ui-form-field #c="uiFormField" label="Coupon code" hint="Optional, e.g. FLAT100"><input uiInput [id]="c.id" [attr.aria-describedby]="c.describedBy()" (input)="coupon.set($any($event.target).value)" /></ui-form-field>
          <ui-form-field #o="uiFormField" label="Orders already placed" hint="0 = first order"><input uiInput inputmode="numeric" [id]="o.id" [value]="prior()" [attr.aria-describedby]="o.describedBy()" (input)="prior.set($any($event.target).value)" /></ui-form-field>
          <ui-form-field #a="uiFormField" label="At" hint="Empty = now" [error]="errors()['at'] ?? ''"><input uiInput type="datetime-local" [id]="a.id" [attr.aria-describedby]="a.describedBy()" (input)="at.set($any($event.target).value)" /></ui-form-field>
        </div>
        <button uiButton type="submit" [loading]="running()">Run simulation</button>
      </form>
    } @else {
      <ui-skeleton class="h-48 max-w-3xl" />
    }

    @if (result(); as r) {
      <section class="mt-8 max-w-3xl" aria-labelledby="sim-result" aria-live="polite">
        <h2 id="sim-result" class="mb-3 text-lg font-semibold">Result</h2>
        <dl class="mb-4 space-y-1 rounded-lg border border-border p-4 text-sm">
          <div class="flex justify-between"><dt>Subtotal</dt><dd>{{ r.subtotal | money }}</dd></div>
          @for (a of r.applied; track a.promotionId) {
            <div class="flex justify-between text-success"><dt>{{ a.name }} <span class="text-text-muted">({{ a.label }})</span></dt><dd>−{{ a.amount | money }}</dd></div>
          }
          @if (r.couponDiscount.amount > 0) {
            <div class="flex justify-between text-success"><dt>Coupon</dt><dd>−{{ r.couponDiscount | money }}</dd></div>
          }
          <div class="flex justify-between"><dt>Shipping</dt><dd>{{ r.shipping.amount === 0 ? 'Free' : (r.shipping | money) }}</dd></div>
          <div class="flex justify-between border-t border-border pt-2 text-base font-semibold"><dt>Total</dt><dd>{{ r.total | money }}</dd></div>
        </dl>
        @if (r.couponNote) {
          <p class="mb-4 rounded-md border border-warning p-3 text-sm">{{ r.couponNote }}</p>
        }
        <h3 class="mb-2 font-semibold">Why each rule did or did not apply</h3>
        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full min-w-[36rem] text-start text-sm">
            <caption class="sr-only">Rule by rule explanation</caption>
            <thead class="bg-surface-alt">
              <tr><th scope="col" class="p-2">Promotion</th><th scope="col" class="p-2">Outcome</th><th scope="col" class="p-2">Reason</th></tr>
            </thead>
            <tbody class="divide-y divide-border">
              @for (t of r.trace; track t.promotionId) {
                <tr>
                  <td class="p-2">{{ t.name }}</td>
                  <td class="p-2"><ui-badge [tone]="t.outcome === 'applied' ? 'success' : 'neutral'">{{ t.outcome === 'applied' ? 'Applied' : 'Skipped' }}</ui-badge></td>
                  <td class="p-2">{{ t.reason }}@if (t.amount) { <span class="block text-xs text-text-muted">{{ t.outcome === 'applied' ? 'Saves' : 'Would save' }} {{ { amount: t.amount, currency: 'INR' } | money }}</span> }</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }
  `,
})
export class SimulatorPageComponent {
  private readonly api = inject(AdminPromotionApi);
  private readonly catalog = inject(CatalogApi);

  protected readonly search = signal('');
  /** One choice per variant of the products matching the search (first 30). */
  protected readonly options = rxResource({
    params: () => this.search().trim(),
    stream: ({ params }) =>
      this.catalog.listing({ filters: {}, sort: 'featured', page: 1, pageSize: 30, ...(params ? { q: params } : {}) }).pipe(
        switchMap((l) => this.catalog.productsByIds(l.items.map((i) => i.id))),
        map((products) =>
          products.flatMap((p) =>
            p.variants.map((v) => {
              const opts = Object.values(v.options).join(' / ');
              return { variantId: v.id, label: `${p.title}${opts ? ` (${opts})` : ''} · ${formatMoney(v.price)}` };
            }),
          ),
        ),
      ),
  });

  protected readonly choices = computed(() => (this.options.hasValue() ? this.options.value() : []));
  protected readonly rows = signal<Row[]>([]);
  protected readonly coupon = signal('');
  protected readonly prior = signal('0');
  protected readonly at = signal('');
  protected readonly running = signal(false);
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly result = signal<SimulationResult | null>(null);

  constructor() {
    inject(SeoService).set({ title: 'Promotion simulator', noindex: true });
    // Start with one row once the product list has loaded.
    effect(() => {
      if (this.options.hasValue() && this.options.value().length > 0 && untracked(() => this.rows().length) === 0) untracked(() => this.addRow());
    });
  }

  protected addRow(): void {
    const first = this.options.hasValue() ? this.options.value()[0]?.variantId : '';
    this.rows.update((r) => [...r, { key: nextKey++, variantId: first ?? '', quantity: '1' }]);
  }

  protected removeRow(key: number): void {
    this.rows.update((r) => r.filter((x) => x.key !== key));
  }

  protected setVariant(key: number, variantId: string): void {
    this.rows.update((r) => r.map((x) => (x.key === key ? { ...x, variantId } : x)));
  }

  protected setQuantity(key: number, quantity: string): void {
    this.rows.update((r) => r.map((x) => (x.key === key ? { ...x, quantity } : x)));
  }

  protected async run(event: Event): Promise<void> {
    event.preventDefault();
    this.errors.set({});
    this.running.set(true);
    try {
      this.result.set(
        await firstValueFrom(
          this.api.simulate({
            items: this.rows().map((r) => ({ variantId: r.variantId, quantity: Number(r.quantity) || 0 })),
            ...(this.coupon().trim() ? { couponCode: this.coupon().trim() } : {}),
            priorOrders: Math.max(0, Number(this.prior()) || 0),
            ...(this.at() ? { at: new Date(this.at()).toISOString() } : {}),
          }),
        ),
      );
    } catch (e) {
      this.result.set(null);
      this.errors.set(e instanceof ApiException ? (e.fields ?? { items: e.message }) : { items: 'The simulation failed. Please try again.' });
    } finally {
      this.running.set(false);
    }
  }
}

