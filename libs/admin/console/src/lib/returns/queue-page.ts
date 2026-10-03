import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { SeoService } from '@ecom/shared/core';
import { AdminReturnApi } from '@ecom/shared/data-access';
import type { ReturnQuery, ReturnStatus } from '@ecom/shared/models';
import { MoneyPipe } from '@ecom/shared/util';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, InputDirective, PaginationComponent, SkeletonComponent } from '@ecom/shared/ui';
import { injectListParams } from '../list-params';
import { RETURN_STATUS_LABEL, returnTone } from './return-labels';

const PAGE_SIZE = 20;
const STATUSES = Object.keys(RETURN_STATUS_LABEL) as ReturnStatus[];

/** Returns queue (RF-02): filter by stage, open one to act on it. */
@Component({
  selector: 'adm-returns-queue',
  imports: [DatePipe, RouterLink, MoneyPipe, BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, InputDirective, PaginationComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="mb-4 flex flex-wrap items-end gap-3" role="search" aria-label="Filter return requests" (submit)="search($event)">
      <div>
        <label for="rq" class="mb-1 block text-sm font-medium">Search</label>
        <input id="rq" uiInput type="search" placeholder="Return, order, customer or email" [value]="q() ?? ''" (input)="draft.set($any($event.target).value)" />
      </div>
      <div>
        <label for="rs" class="mb-1 block text-sm font-medium">Status</label>
        <select id="rs" uiInput (change)="list.patch({ status: $any($event.target).value || null })">
          <option value="">All statuses</option>
          @for (s of statuses; track s) {
            <option [value]="s" [selected]="status() === s">{{ labels[s] }}</option>
          }
        </select>
      </div>
      <button uiButton type="submit" variant="secondary">Search</button>
    </form>

    @if (resource.hasValue()) {
      @let data = resource.value();
      @if (data.items.length === 0) {
        <ui-empty-state title="No return requests" description="Requests from customers appear here." />
      } @else {
        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full min-w-[44rem] text-left text-sm">
            <caption class="sr-only">Return requests</caption>
            <thead class="bg-surface-alt">
              <tr>
                <th scope="col" class="p-2">Return</th>
                <th scope="col" class="p-2">Customer</th>
                <th scope="col" class="p-2">Order</th>
                <th scope="col" class="p-2">Requested</th>
                <th scope="col" class="p-2 text-right">Refund</th>
                <th scope="col" class="p-2">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              @for (r of data.items; track r.id) {
                <tr>
                  <td class="p-2"><a [routerLink]="['/returns/queue', r.id]" class="font-medium text-primary hover:underline">{{ r.id }}</a></td>
                  <td class="p-2">{{ r.customerName }}<span class="block text-xs text-text-muted">{{ r.customerEmail }}</span></td>
                  <td class="p-2"><a [routerLink]="['/orders', r.orderId]" class="hover:underline">{{ r.orderId }}</a></td>
                  <td class="whitespace-nowrap p-2 text-text-muted">{{ r.createdAt | date: 'd MMM y, h:mm a' }}</td>
                  <td class="p-2 text-right">{{ r.refund.total | money }}</td>
                  <td class="p-2"><ui-badge [tone]="tone(r.status)">{{ labels[r.status] }}</ui-badge></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p class="mt-2 text-sm text-text-muted" aria-live="polite">{{ data.total }} requests</p>
        <ui-pagination class="mt-4" [page]="data.page" [pageSize]="data.pageSize" [total]="data.total" />
      }
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-48" />
    }
  `,
})
export class ReturnsQueuePageComponent {
  private readonly api = inject(AdminReturnApi);
  protected readonly list = injectListParams();
  protected readonly statuses = STATUSES;
  protected readonly labels = RETURN_STATUS_LABEL;
  protected readonly tone = returnTone;

  protected readonly q = computed(() => this.list.str('q'));
  protected readonly status = computed(() => this.list.str('status') as ReturnStatus | undefined);
  protected readonly draft = signal('');
  private readonly query = computed<ReturnQuery>(() => ({ q: this.q(), status: this.status(), page: this.list.num('page', 1), pageSize: PAGE_SIZE }));
  protected readonly resource = rxResource({ params: () => this.query(), stream: ({ params }) => this.api.list(params) });

  constructor() {
    inject(SeoService).set({ title: 'Return requests', noindex: true });
    effect(() => {
      this.q();
      untracked(() => this.draft.set(this.q() ?? ''));
    });
  }

  protected search(event: Event): void {
    event.preventDefault();
    this.list.patch({ q: this.draft().trim() || null });
  }
}
