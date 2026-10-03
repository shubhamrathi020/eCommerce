import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { LocaleDatePipe, SeoService } from '@ecom/shared/core';
import { SellerPortalApi } from '@ecom/shared/data-access';
import { MoneyPipe } from '@ecom/shared/util';
import { BadgeComponent, ErrorStateComponent, SkeletonComponent } from '@ecom/shared/ui';

const money = (amount: number) => ({ amount, currency: 'INR' as const });

/** What the seller is owed (MP-03): sales not yet on a statement, and every statement issued to them. */
@Component({
  selector: 'sel-payouts',
  imports: [LocaleDatePipe, MoneyPipe, BadgeComponent, ErrorStateComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-1 text-2xl font-bold">Payouts</h1>
    <p class="mb-4 max-w-2xl text-sm text-text-muted">You are paid for delivered shipments, less the marketplace commission, minus any returned items that were refunded. Statements are issued by the marketplace team.</p>
    @if (resource.hasValue()) {
      @let up = resource.value().upcoming;
      <section class="mb-8 max-w-3xl" aria-labelledby="up-h">
        <h2 id="up-h" class="mb-2 text-lg font-semibold">Not yet on a statement</h2>
        <dl class="mb-2 grid grid-cols-3 gap-3 text-sm">
          <div class="rounded-lg border border-border p-3"><dt class="text-xs text-text-muted">Sales</dt><dd class="text-lg font-semibold">{{ m(up.gross) | money }}</dd></div>
          <div class="rounded-lg border border-border p-3"><dt class="text-xs text-text-muted">Commission</dt><dd class="text-lg font-semibold">−{{ m(up.commission) | money }}</dd></div>
          <div class="rounded-lg border border-border p-3"><dt class="text-xs text-text-muted">You will receive</dt><dd class="text-lg font-semibold">{{ m(up.net) | money }}</dd></div>
        </dl>
        @if (up.lines.length || up.adjustments.length) {
          <ul class="text-sm text-text-muted" aria-label="What this is made of">
            @for (l of up.lines; track l.shipmentId) {
              <li>Order {{ l.orderId }} delivered {{ l.deliveredAt | date: 'd MMM' }}: {{ m(l.gross) | money }} less {{ l.percent }}% commission</li>
            }
            @for (a of up.adjustments; track a.returnId) {
              <li>Return {{ a.returnId }} refunded {{ a.refundedAt | date: 'd MMM' }}: {{ m(a.net) | money }}</li>
            }
          </ul>
        } @else {
          <p class="text-sm text-text-muted">Nothing delivered yet.</p>
        }
      </section>

      <h2 class="mb-2 text-lg font-semibold">Statements</h2>
      @if (resource.value().statements.length === 0) {
        <p class="text-sm text-text-muted">No statements have been issued to you yet.</p>
      } @else {
        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full min-w-[36rem] text-start text-sm">
            <caption class="sr-only">Your payout statements</caption>
            <thead class="bg-surface-alt"><tr><th scope="col" class="p-2">Statement</th><th scope="col" class="p-2">Period</th><th scope="col" class="p-2 text-end">Sales</th><th scope="col" class="p-2 text-end">Commission</th><th scope="col" class="p-2 text-end">Net</th><th scope="col" class="p-2">Status</th></tr></thead>
            <tbody class="divide-y divide-border">
              @for (st of resource.value().statements; track st.id) {
                <tr>
                  <th scope="row" class="p-2 font-mono text-xs font-normal">{{ st.id }}</th>
                  <td class="whitespace-nowrap p-2 text-text-muted">{{ st.from }} to {{ st.to }}</td>
                  <td class="p-2 text-end">{{ m(st.gross) | money }}</td>
                  <td class="p-2 text-end">−{{ m(st.commission) | money }}</td>
                  <td class="p-2 text-end font-medium">{{ m(st.net) | money }}</td>
                  <td class="p-2"><ui-badge [tone]="st.status === 'paid' ? 'success' : 'warning'">{{ st.status === 'paid' ? 'Paid' : 'Issued' }}</ui-badge>@if (st.reference) { <span class="block text-xs text-text-muted">{{ st.reference }}</span> }</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-48" />
    }
  `,
})
export class PayoutsPageComponent {
  private readonly api = inject(SellerPortalApi);
  protected readonly resource = rxResource({ stream: () => this.api.payouts() });
  protected readonly m = money;

  constructor() {
    inject(SeoService).set({ title: 'Payouts', noindex: true });
  }
}
