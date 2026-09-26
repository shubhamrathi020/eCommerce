import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { SeoService } from '@ecom/shared/core';
import { OrderApi } from '@ecom/shared/data-access';
import type { Order } from '@ecom/shared/models';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, SkeletonComponent } from '@ecom/shared/ui';
import { MoneyPipe } from '@ecom/shared/util';

/** Orders placed on this device. Account-based order history arrives with the accounts module. */
@Component({
  selector: 'app-orders-list-page',
  imports: [DatePipe, RouterLink, MoneyPipe, BadgeComponent, ButtonComponent, EmptyStateComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-4 text-2xl font-bold md:text-3xl">Your orders</h1>
    @if (resource.isLoading()) {
      <ui-skeleton class="h-24" />
    } @else if (orders().length === 0) {
      <ui-empty-state title="No orders yet" description="Orders you place on this device show up here.">
        <a uiButton routerLink="/">Start shopping</a>
      </ui-empty-state>
    } @else {
      <ul class="space-y-3">
        @for (o of orders(); track o.id) {
          <li>
            <a [routerLink]="['/orders', o.id]" class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-4 hover:bg-surface-alt">
              <span>
                <span class="block font-medium">{{ o.id }}</span>
                <span class="block text-sm text-text-muted">{{ o.createdAt | date: 'd MMM y' }} · {{ o.totals.itemCount }} item(s)</span>
              </span>
              <ui-badge [tone]="o.status === 'cancelled' ? 'danger' : o.status === 'delivered' ? 'success' : 'primary'">{{ o.status.replace('_', ' ') }}</ui-badge>
              <span class="font-semibold">{{ o.totals.total | money }}</span>
            </a>
          </li>
        }
      </ul>
    }
  `,
})
export class OrdersListPageComponent {
  private readonly api = inject(OrderApi);
  protected readonly resource = rxResource({ stream: () => this.api.list() });
  protected readonly orders = computed<Order[]>(() => (this.resource.hasValue() ? this.resource.value() : []));

  constructor() {
    inject(SeoService).set({ title: 'Your orders', noindex: true, path: '/orders' });
  }
}
