import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { SeoService } from '@ecom/shared/core';
import { AdminDashboardApi } from '@ecom/shared/data-access';
import { BadgeComponent, ErrorStateComponent, InputDirective, SkeletonComponent } from '@ecom/shared/ui';
import { MoneyPipe } from '@ecom/shared/util';
import { RevenueChartComponent } from './revenue-chart';

@Component({
  selector: 'adm-dashboard',
  imports: [RouterLink, MoneyPipe, BadgeComponent, ErrorStateComponent, InputDirective, SkeletonComponent, RevenueChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">Dashboard</h1>
      <div>
        <label for="period" class="sr-only">Period</label>
        <select id="period" uiInput class="!w-auto" (change)="days.set(+$any($event.target).value)">
          <option value="7">Last 7 days</option>
          <option value="30" selected>Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>
    </div>

    @if (metrics.hasValue()) {
      @let m = metrics.value();
      <section aria-label="Key figures" class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div class="rounded-lg border border-border p-4"><p class="text-sm text-text-muted">Revenue</p><p class="text-2xl font-bold">{{ m.revenue | money }}</p></div>
        <div class="rounded-lg border border-border p-4"><p class="text-sm text-text-muted">Orders</p><p class="text-2xl font-bold">{{ m.orders }}</p></div>
        <div class="rounded-lg border border-border p-4"><p class="text-sm text-text-muted">Average order value</p><p class="text-2xl font-bold">{{ m.averageOrderValue | money }}</p></div>
        <div class="rounded-lg border border-border p-4"><p class="text-sm text-text-muted">New customers</p><p class="text-2xl font-bold">{{ m.newCustomers }}</p></div>
      </section>

      <section class="mb-6 rounded-lg border border-border p-4" aria-labelledby="rev">
        <h2 id="rev" class="mb-2 font-semibold">Revenue by day</h2>
        <adm-revenue-chart [data]="m.byDay" />
      </section>

      <div class="grid gap-6 lg:grid-cols-3">
        <section class="rounded-lg border border-border p-4" aria-labelledby="st">
          <h2 id="st" class="mb-2 font-semibold">Orders by status</h2>
          <ul class="space-y-1 text-sm">
            @for (s of m.statusBreakdown; track s.status) {
              <li class="flex items-center justify-between"><ui-badge>{{ s.status.replace('_', ' ') }}</ui-badge><span>{{ s.count }}</span></li>
            }
          </ul>
          <a routerLink="/orders" class="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">View all orders</a>
        </section>

        <section class="rounded-lg border border-border p-4" aria-labelledby="tp">
          <h2 id="tp" class="mb-2 font-semibold">Top products</h2>
          <ol class="space-y-2 text-sm">
            @for (p of m.topProducts; track p.title) {
              <li class="flex justify-between gap-2"><span class="min-w-0 truncate" [attr.title]="p.title">{{ p.title }}</span><span class="shrink-0 text-text-muted">{{ p.units }} sold · {{ p.revenue | money }}</span></li>
            }
          </ol>
        </section>

        <section class="rounded-lg border border-border p-4" aria-labelledby="ls">
          <h2 id="ls" class="mb-2 font-semibold">Low stock</h2>
          @if (m.lowStock.length === 0) {
            <p class="text-sm text-text-muted">Nothing running low.</p>
          } @else {
            <ul class="space-y-2 text-sm">
              @for (v of m.lowStock; track v.sku) {
                <li class="flex justify-between gap-2"><span class="min-w-0 truncate" [attr.title]="v.title">{{ v.title }} <span class="text-text-muted">({{ v.sku }})</span></span><ui-badge [tone]="v.stock === 0 ? 'danger' : 'warning'">{{ v.stock }} left</ui-badge></li>
              }
            </ul>
          }
          <a routerLink="/inventory/stock" [queryParams]="{ filter: 'low' }" class="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">Manage stock</a>
        </section>
      </div>
    } @else if (metrics.status() === 'error') {
      <ui-error-state (retry)="metrics.reload()" />
    } @else {
      <ui-skeleton class="h-40" />
    }
  `,
})
export class DashboardPageComponent {
  private readonly api = inject(AdminDashboardApi);
  protected readonly days = signal(30);
  protected readonly metrics = rxResource({ params: () => this.days(), stream: ({ params }) => this.api.metrics(params) });

  constructor() {
    inject(SeoService).set({ title: 'Dashboard', noindex: true });
  }
}
