import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { SeoService } from '@ecom/shared/core';
import { ReturnApi } from '@ecom/shared/data-access';
import { MoneyPipe } from '@ecom/shared/util';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, SkeletonComponent } from '@ecom/shared/ui';
import { RETURN_STATUS_LABEL, returnTone } from './return-labels';

/** The customer's return requests, with their store credit balance. */
@Component({
  selector: 'app-returns-list-page',
  imports: [DatePipe, RouterLink, MoneyPipe, BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-1 text-2xl font-bold md:text-3xl">Returns and refunds</h1>
    <p class="mb-4 text-sm text-text-muted">To start a return, open a delivered order and choose “Return items”. @if (credit.hasValue() && credit.value().amount > 0) { <span class="ml-1 font-medium text-text">Store credit: {{ credit.value() | money }}</span> }</p>

    @if (resource.hasValue()) {
      @if (resource.value().length === 0) {
        <ui-empty-state title="No returns yet" description="Returns you request will show up here with their progress.">
          <a uiButton routerLink="/orders">View my orders</a>
        </ui-empty-state>
      } @else {
        <ul class="divide-y divide-border rounded-lg border border-border">
          @for (r of resource.value(); track r.id) {
            <li class="flex flex-wrap items-center gap-3 p-4">
              <span class="min-w-0 flex-1">
                <a [routerLink]="['/account/returns', r.id]" class="font-medium hover:text-primary">{{ r.id }}</a>
                <span class="block text-sm text-text-muted">Order {{ r.orderId }} · {{ r.items.length }} {{ r.items.length === 1 ? 'item' : 'items' }} · requested {{ r.createdAt | date: 'd MMM y' }}</span>
              </span>
              <span class="text-sm">{{ r.refund.total | money }}</span>
              <ui-badge [tone]="tone(r.status)">{{ labels[r.status] }}</ui-badge>
            </li>
          }
        </ul>
      }
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-48" />
    }
  `,
})
export class ReturnsListPageComponent {
  private readonly api = inject(ReturnApi);
  protected readonly resource = rxResource({ stream: () => this.api.list() });
  protected readonly credit = rxResource({ stream: () => this.api.storeCredit() });
  protected readonly labels = RETURN_STATUS_LABEL;
  protected readonly tone = returnTone;

  constructor() {
    inject(SeoService).set({ title: 'Returns and refunds', noindex: true, path: '/account/returns' });
  }
}
