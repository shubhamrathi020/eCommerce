import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LocaleDatePipe, SeoService } from '@ecom/shared/core';
import { AdminOrderApi } from '@ecom/shared/data-access';
import type { AdminOrderQuery, OrderStatus, PaymentMethod } from '@ecom/shared/models';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, InputDirective, PaginationComponent, SkeletonComponent } from '@ecom/shared/ui';
import { MoneyPipe } from '@ecom/shared/util';
import { injectListParams } from '../list-params';

const STATUSES: OrderStatus[] = ['pending_payment', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];

export const statusTone = (s: OrderStatus): 'neutral' | 'primary' | 'success' | 'warning' | 'danger' =>
  ({ pending_payment: 'warning', confirmed: 'primary', packed: 'primary', shipped: 'primary', delivered: 'success', cancelled: 'danger' } as const)[s];

@Component({
  selector: 'adm-orders',
  imports: [LocaleDatePipe, RouterLink, MoneyPipe, BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, InputDirective, PaginationComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-4 text-2xl font-bold">Orders</h1>

    <form class="mb-4 flex flex-wrap items-end gap-3" role="search" aria-label="Filter orders" (submit)="search($event)">
      <div>
        <label for="q" class="mb-1 block text-sm font-medium">Order or customer</label>
        <input id="q" uiInput type="search" [value]="q() ?? ''" (input)="draft.set($any($event.target).value)" />
      </div>
      <div>
        <label for="status" class="mb-1 block text-sm font-medium">Status</label>
        <select id="status" uiInput (change)="list.patch({ status: $any($event.target).value || null })">
          <option value="">All</option>
          @for (s of statuses; track s) {
            <option [value]="s" [selected]="status() === s">{{ label(s) }}</option>
          }
        </select>
      </div>
      <div>
        <label for="pay" class="mb-1 block text-sm font-medium">Payment</label>
        <select id="pay" uiInput (change)="list.patch({ pay: $any($event.target).value || null })">
          <option value="">All</option>
          <option value="razorpay" [selected]="pay() === 'razorpay'">Online</option>
          <option value="cod" [selected]="pay() === 'cod'">Cash on delivery</option>
        </select>
      </div>
      <div>
        <label for="from" class="mb-1 block text-sm font-medium">From</label>
        <input id="from" uiInput type="date" [value]="from() ?? ''" (change)="list.patch({ from: $any($event.target).value || null })" />
      </div>
      <div>
        <label for="to" class="mb-1 block text-sm font-medium">To</label>
        <input id="to" uiInput type="date" [value]="to() ?? ''" (change)="list.patch({ to: $any($event.target).value || null })" />
      </div>
      <button uiButton type="submit" variant="secondary">Search</button>
    </form>

    @if (resource.hasValue()) {
      @let page = resource.value();
      @if (page.items.length === 0) {
        <ui-empty-state title="No orders found" description="Try different filters." />
      } @else {
        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full min-w-[44rem] text-start text-sm">
            <caption class="sr-only">Orders</caption>
            <thead class="bg-surface-alt">
              <tr><th scope="col" class="p-2">Order</th><th scope="col" class="p-2">Date</th><th scope="col" class="p-2">Customer</th><th scope="col" class="p-2">Status</th><th scope="col" class="p-2">Payment</th><th scope="col" class="p-2 text-end">Items</th><th scope="col" class="p-2 text-end">Total</th></tr>
            </thead>
            <tbody class="divide-y divide-border">
              @for (o of page.items; track o.id) {
                <tr>
                  <td class="p-2"><a [routerLink]="['/orders', o.id]" class="font-medium text-primary hover:underline">{{ o.id }}</a></td>
                  <td class="p-2 text-text-muted">{{ o.createdAt | date: 'd MMM y, h:mm a' }}</td>
                  <td class="p-2">{{ o.customerName }}</td>
                  <td class="p-2"><ui-badge [tone]="tone(o.status)">{{ label(o.status) }}</ui-badge></td>
                  <td class="p-2">{{ o.paymentMethod === 'cod' ? 'Cash on delivery' : 'Online' }} · {{ o.paymentStatus.replace('_', ' ') }}</td>
                  <td class="p-2 text-end">{{ o.itemCount }}</td>
                  <td class="p-2 text-end">{{ o.total | money }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p class="mt-2 text-sm text-text-muted" aria-live="polite">{{ page.total }} orders</p>
        <ui-pagination class="mt-4" [page]="page.page" [pageSize]="page.pageSize" [total]="page.total" />
      }
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-48" />
    }
  `,
})
export class OrdersPageComponent {
  private readonly api = inject(AdminOrderApi);
  protected readonly list = injectListParams();
  protected readonly statuses = STATUSES;

  protected readonly q = computed(() => this.list.str('q'));
  protected readonly status = computed(() => this.list.str('status') as OrderStatus | undefined);
  protected readonly pay = computed(() => this.list.str('pay') as PaymentMethod | undefined);
  protected readonly from = computed(() => this.list.str('from'));
  protected readonly to = computed(() => this.list.str('to'));
  protected readonly draft = signal('');

  private readonly query = computed<AdminOrderQuery>(() => ({ q: this.q(), status: this.status(), paymentMethod: this.pay(), from: this.from(), to: this.to(), page: this.list.num('page', 1), pageSize: 20 }));
  protected readonly resource = rxResource({ params: () => this.query(), stream: ({ params }) => this.api.list(params) });

  constructor() {
    inject(SeoService).set({ title: 'Orders', noindex: true });
    effect(() => {
      this.q();
      untracked(() => this.draft.set(this.q() ?? ''));
    });
  }

  protected tone = statusTone;

  protected label(s: OrderStatus): string {
    return s.replace('_', ' ');
  }

  protected search(event: Event): void {
    event.preventDefault();
    this.list.patch({ q: this.draft().trim() || null });
  }
}
