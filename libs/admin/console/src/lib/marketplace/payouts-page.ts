import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { LocaleDatePipe, SeoService, ToastService } from '@ecom/shared/core';
import { AdminSellerApi } from '@ecom/shared/data-access';
import { ApiException, type PayoutPreview, type PayoutStatement } from '@ecom/contracts';
import { MoneyPipe } from '@ecom/shared/util';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, FormFieldComponent, InputDirective, SkeletonComponent } from '@ecom/shared/ui';

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const money = (amount: number) => ({ amount, currency: 'INR' as const });

/** Payout statements (MP-03): see what a seller is owed for a period, issue it, and record the transfer. No money moves in this demo. */
@Component({
  selector: 'adm-payouts',
  imports: [LocaleDatePipe, MoneyPipe, BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, FormFieldComponent, InputDirective, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="mb-4 max-w-2xl text-sm text-text-muted">A statement is built from the seller's delivered shipments in the period, less commission, minus any returns refunded in the period. Each shipment and return can be on one statement only.</p>
    <form class="mb-6 flex flex-wrap items-start gap-3" (submit)="runPreview($event)" novalidate aria-label="Build a statement">
      <ui-form-field #s="uiFormField" label="Seller" [error]="errors()['sellerId'] ?? ''">
        <select uiInput [id]="s.id" [attr.aria-describedby]="s.describedBy()" (change)="sellerId.set($any($event.target).value)">
          <option value="">Choose…</option>
          @for (x of approved(); track x.id) {
            <option [value]="x.id">{{ x.displayName }}</option>
          }
        </select>
      </ui-form-field>
      <ui-form-field #f="uiFormField" label="From" [error]="errors()['from'] ?? ''"><input uiInput type="date" [id]="f.id" [value]="from()" [attr.aria-describedby]="f.describedBy()" (input)="from.set($any($event.target).value)" /></ui-form-field>
      <ui-form-field #t="uiFormField" label="To" [error]="errors()['to'] ?? ''"><input uiInput type="date" [id]="t.id" [value]="to()" [attr.aria-describedby]="t.describedBy()" (input)="to.set($any($event.target).value)" /></ui-form-field>
      <div class="pt-6"><button uiButton variant="secondary" type="submit" [loading]="busy()">Preview</button></div>
    </form>
    @if (formError()) {
      <p class="mb-4 text-sm text-danger" role="alert">{{ formError() }}</p>
    }

    @if (preview(); as p) {
      <section class="mb-8 max-w-3xl" aria-labelledby="pv">
        <h2 id="pv" class="mb-2 text-lg font-semibold">{{ p.sellerName }}: {{ p.from }} to {{ p.to }}</h2>
        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full min-w-[34rem] text-start text-sm">
            <caption class="sr-only">Statement preview</caption>
            <thead class="bg-surface-alt"><tr><th scope="col" class="p-2">Order</th><th scope="col" class="p-2">Date</th><th scope="col" class="p-2 text-end">Sales</th><th scope="col" class="p-2 text-end">Commission</th><th scope="col" class="p-2 text-end">Net</th></tr></thead>
            <tbody class="divide-y divide-border">
              @for (l of p.lines; track l.shipmentId) {
                <tr><th scope="row" class="p-2 font-normal">{{ l.orderId }}<span class="block text-xs text-text-muted">{{ l.percent }}%</span></th><td class="p-2">{{ l.deliveredAt | date: 'd MMM y' }}</td><td class="p-2 text-end">{{ m(l.gross) | money }}</td><td class="p-2 text-end">−{{ m(l.commission) | money }}</td><td class="p-2 text-end">{{ m(l.net) | money }}</td></tr>
              }
              @for (a of p.adjustments; track a.returnId) {
                <tr><th scope="row" class="p-2 font-normal">Return {{ a.returnId }}<span class="block text-xs text-text-muted">order {{ a.orderId }}</span></th><td class="p-2">{{ a.refundedAt | date: 'd MMM y' }}</td><td class="p-2 text-end">{{ m(a.gross) | money }}</td><td class="p-2 text-end">{{ m(-a.commission) | money }}</td><td class="p-2 text-end">{{ m(a.net) | money }}</td></tr>
              }
              @if (p.lines.length === 0 && p.adjustments.length === 0) {
                <tr><td colspan="5" class="p-3 text-text-muted">Nothing to pay out in this period.</td></tr>
              }
            </tbody>
            <tfoot class="bg-surface-alt font-semibold"><tr><th scope="row" colspan="2" class="p-2 text-start">Total</th><td class="p-2 text-end">{{ m(p.gross) | money }}</td><td class="p-2 text-end">−{{ m(p.commission) | money }}</td><td class="p-2 text-end">{{ m(p.net) | money }}</td></tr></tfoot>
          </table>
        </div>
        <button uiButton class="mt-3" type="button" [loading]="busy()" [disabled]="p.lines.length === 0 && p.adjustments.length === 0" (click)="issue(p)">Issue statement</button>
      </section>
    }

    <h2 class="mb-2 text-lg font-semibold">Statements</h2>
    @if (statements.hasValue()) {
      @if (statements.value().length === 0) {
        <ui-empty-state title="No statements yet" />
      } @else {
        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full min-w-[44rem] text-start text-sm">
            <caption class="sr-only">Issued payout statements</caption>
            <thead class="bg-surface-alt"><tr><th scope="col" class="p-2">Statement</th><th scope="col" class="p-2">Seller</th><th scope="col" class="p-2">Period</th><th scope="col" class="p-2 text-end">Net</th><th scope="col" class="p-2">Status</th><th scope="col" class="p-2"><span class="sr-only">Action</span></th></tr></thead>
            <tbody class="divide-y divide-border">
              @for (st of statements.value(); track st.id) {
                <tr>
                  <th scope="row" class="p-2 font-mono text-xs font-normal">{{ st.id }}</th>
                  <td class="p-2">{{ st.sellerName }}</td>
                  <td class="whitespace-nowrap p-2 text-text-muted">{{ st.from }} to {{ st.to }}</td>
                  <td class="p-2 text-end">{{ m(st.net) | money }}</td>
                  <td class="p-2"><ui-badge [tone]="st.status === 'paid' ? 'success' : 'warning'">{{ st.status === 'paid' ? 'Paid' : 'Issued' }}</ui-badge>@if (st.reference) { <span class="block text-xs text-text-muted">{{ st.reference }}</span> }</td>
                  <td class="p-2">
                    @if (st.status === 'issued') {
                      <div class="flex items-end justify-end gap-2">
                        <ui-form-field #r="uiFormField" label="Transfer reference" [error]="paidFor() === st.id ? payError() : ''">
                          <input uiInput [id]="r.id" class="!w-44" [attr.aria-describedby]="r.describedBy()" (input)="reference.set($any($event.target).value); paidFor.set(st.id)" />
                        </ui-form-field>
                        <button uiButton size="sm" type="button" (click)="markPaid(st)">Mark {{ st.id }} paid</button>
                      </div>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    } @else if (statements.status() === 'error') {
      <ui-error-state (retry)="statements.reload()" />
    } @else {
      <ui-skeleton class="h-32" />
    }
  `,
})
export class PayoutsPageComponent {
  private readonly api = inject(AdminSellerApi);
  private readonly toast = inject(ToastService);
  protected readonly sellers = rxResource({ stream: () => this.api.sellers() });
  protected readonly statements = rxResource({ stream: () => this.api.statements() });
  protected readonly m = money;

  protected readonly sellerId = signal('');
  protected readonly from = signal(iso(Date.now() - 30 * 86_400_000));
  protected readonly to = signal(iso(Date.now()));
  protected readonly preview = signal<PayoutPreview | null>(null);
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly formError = signal('');
  protected readonly busy = signal(false);
  protected readonly reference = signal('');
  protected readonly paidFor = signal('');
  protected readonly payError = signal('');

  constructor() {
    inject(SeoService).set({ title: 'Payouts', noindex: true });
  }

  protected approved() {
    return (this.sellers.hasValue() ? this.sellers.value() : []).filter((s) => s.status === 'approved' || s.status === 'suspended');
  }

  protected async runPreview(event: Event): Promise<void> {
    event.preventDefault();
    this.errors.set({});
    this.formError.set('');
    if (!this.sellerId()) {
      this.errors.set({ sellerId: 'Choose a seller' });
      return;
    }
    this.busy.set(true);
    try {
      this.preview.set(await firstValueFrom(this.api.payoutPreview(this.sellerId(), this.from(), this.to())));
    } catch (e) {
      this.preview.set(null);
      this.fail(e);
    } finally {
      this.busy.set(false);
    }
  }

  protected async issue(p: PayoutPreview): Promise<void> {
    this.busy.set(true);
    try {
      const st = await firstValueFrom(this.api.issuePayout(p.sellerId, p.from, p.to));
      this.toast.success(`Statement ${st.id} issued.`);
      this.preview.set(null);
      this.statements.reload();
    } catch (e) {
      this.fail(e);
    } finally {
      this.busy.set(false);
    }
  }

  protected async markPaid(st: PayoutStatement): Promise<void> {
    this.payError.set('');
    if (this.paidFor() !== st.id) this.reference.set('');
    this.paidFor.set(st.id);
    try {
      await firstValueFrom(this.api.markPaid(st.id, this.reference()));
      this.toast.success(`${st.id} marked as paid.`);
      this.reference.set('');
      this.statements.reload();
    } catch (e) {
      this.payError.set(e instanceof ApiException ? (e.fields?.['reference'] ?? e.message) : 'That did not work.');
    }
  }

  private fail(e: unknown): void {
    if (e instanceof ApiException) {
      this.errors.set(e.fields ?? {});
      this.formError.set(e.fields ? '' : e.message);
    } else this.formError.set('That did not work. Please try again.');
  }
}
