import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { APP_CONFIG, SeoService } from '@ecom/shared/core';
import { AdminAnalyticsApi } from '@ecom/shared/data-access';
import type { ProductSort } from '@ecom/shared/models';
import { MoneyPipe } from '@ecom/shared/util';
import { EmptyStateComponent, ErrorStateComponent, PaginationComponent, SkeletonComponent } from '@ecom/shared/ui';
import { injectListParams } from '../list-params';
import { ExportBarComponent } from './analytics-layout';

const PAGE_SIZE = 25;
const money = (amount: number) => ({ amount, currency: 'INR' as const });

/** Where shoppers drop off (AN-01): visitors at each step and the share lost since the step before. */
@Component({
  selector: 'adm-funnel',
  imports: [ExportBarComponent, ErrorStateComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <adm-export-bar report="funnel" [days]="days()" />
    @if (resource.hasValue()) {
      <div class="overflow-x-auto rounded-lg border border-border">
        <table class="w-full min-w-[36rem] text-left text-sm">
          <caption class="sr-only">Shopping funnel for the last {{ days() }} days</caption>
          <thead class="bg-surface-alt">
            <tr><th scope="col" class="p-2">Step</th><th scope="col" class="p-2 text-right">Visitors</th><th scope="col" class="p-2 text-right">Lost since previous step</th><th scope="col" class="p-2">Share of first step</th></tr>
          </thead>
          <tbody class="divide-y divide-border">
            @for (s of resource.value(); track s.key) {
              <tr>
                <th scope="row" class="p-2 font-medium">{{ s.label }}</th>
                <td class="p-2 text-right">{{ s.visitors }}</td>
                <td class="p-2 text-right">{{ s.dropOffPercent === null ? '' : s.dropOffPercent + '%' }}</td>
                <td class="p-2">
                  <span class="inline-block h-3 rounded bg-primary align-middle" [style.width.px]="s.ofFirstPercent * 1.6" aria-hidden="true"></span>
                  <span class="ml-2">{{ s.ofFirstPercent }}%</span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-48" />
    }
  `,
})
export class FunnelPageComponent {
  private readonly api = inject(AdminAnalyticsApi);
  private readonly list = injectListParams();
  protected readonly days = computed(() => this.list.num('days', 30));
  protected readonly resource = rxResource({ params: () => this.days(), stream: ({ params }) => this.api.funnel(params) });

  constructor() {
    inject(SeoService).set({ title: 'Funnel', noindex: true });
  }
}

const PRODUCT_COLUMNS: { key: ProductSort; label: string; numeric: boolean }[] = [
  { key: 'title', label: 'Product', numeric: false },
  { key: 'views', label: 'Views', numeric: true },
  { key: 'adds', label: 'Added to cart', numeric: true },
  { key: 'addRatePercent', label: 'Add rate', numeric: true },
  { key: 'units', label: 'Units sold', numeric: true },
  { key: 'revenue', label: 'Item revenue', numeric: true },
  { key: 'sellThroughPercent', label: 'Sell-through', numeric: true },
];

/** Top and slow products (AN-02): sortable, paginated and exportable. */
@Component({
  selector: 'adm-product-performance',
  imports: [MoneyPipe, ExportBarComponent, ErrorStateComponent, PaginationComponent, SkeletonComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <adm-export-bar report="products" [days]="days()" />
    @if (resource.hasValue()) {
      @let data = resource.value();
      @if (data.items.length === 0) {
        <ui-empty-state title="No activity in this period" />
      } @else {
        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full min-w-[56rem] text-left text-sm">
            <caption class="sr-only">Product performance for the last {{ days() }} days, sorted by {{ sort() }} {{ dir() === 'asc' ? 'ascending' : 'descending' }}</caption>
            <thead class="bg-surface-alt">
              <tr>
                @for (c of columns; track c.key) {
                  <th scope="col" class="p-0" [class.text-right]="c.numeric" [attr.aria-sort]="sort() === c.key ? (dir() === 'asc' ? 'ascending' : 'descending') : null">
                    <button type="button" class="min-h-11 w-full px-2 font-semibold hover:bg-border" [class.text-right]="c.numeric" (click)="sortBy(c.key)">{{ c.label }}@if (sort() === c.key) { <span aria-hidden="true"> {{ dir() === 'asc' ? '↑' : '↓' }}</span> }</button>
                  </th>
                }
                <th scope="col" class="p-2 text-right">In stock</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              @for (r of data.items; track r.productId) {
                <tr>
                  <td class="p-2"><span class="block max-w-xs truncate" [attr.title]="r.title">{{ r.title }}</span><span class="text-xs text-text-muted">{{ r.productId }}</span></td>
                  <td class="p-2 text-right">{{ r.views }}</td>
                  <td class="p-2 text-right">{{ r.adds }}</td>
                  <td class="p-2 text-right">{{ r.addRatePercent }}%</td>
                  <td class="p-2 text-right">{{ r.units }}</td>
                  <td class="p-2 text-right">{{ money(r.revenue) | money }}</td>
                  <td class="p-2 text-right">{{ r.sellThroughPercent }}%</td>
                  <td class="p-2 text-right">{{ r.stock }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p class="mt-2 text-sm text-text-muted" aria-live="polite">{{ data.total }} products with activity. Item revenue is units times the price paid, before discounts and shipping.</p>
        <ui-pagination class="mt-4" [page]="data.page" [pageSize]="data.pageSize" [total]="data.total" />
      }
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-64" />
    }
  `,
})
export class ProductPerformancePageComponent {
  private readonly api = inject(AdminAnalyticsApi);
  protected readonly list = injectListParams();
  protected readonly columns = PRODUCT_COLUMNS;
  protected readonly money = money;
  protected readonly days = computed(() => this.list.num('days', 30));
  protected readonly sort = computed(() => (this.list.str('sort') as ProductSort | undefined) ?? 'units');
  protected readonly dir = computed(() => (this.list.str('dir') === 'asc' ? 'asc' : 'desc'));
  private readonly query = computed(() => ({ days: this.days(), sort: this.sort(), dir: this.dir() as 'asc' | 'desc', page: this.list.num('page', 1), pageSize: PAGE_SIZE }));
  protected readonly resource = rxResource({ params: () => this.query(), stream: ({ params }) => this.api.products(params) });

  constructor() {
    inject(SeoService).set({ title: 'Product performance', noindex: true });
  }

  protected sortBy(key: ProductSort): void {
    this.list.patch({ sort: key, dir: this.sort() === key && this.dir() === 'desc' ? 'asc' : 'desc' });
  }
}

/** Top searches, searches that find nothing, and click-through (AN-03). */
@Component({
  selector: 'adm-search-analytics',
  imports: [ExportBarComponent, ErrorStateComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <adm-export-bar report="search" [days]="days()" />
    @if (resource.hasValue()) {
      @let r = resource.value();
      <div class="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="top-h">
          <h2 id="top-h" class="mb-2 text-lg font-semibold">Top searches</h2>
          <div class="overflow-x-auto rounded-lg border border-border">
            <table class="w-full min-w-[26rem] text-left text-sm">
              <caption class="sr-only">Top searches</caption>
              <thead class="bg-surface-alt"><tr><th scope="col" class="p-2">Search</th><th scope="col" class="p-2 text-right">Searches</th><th scope="col" class="p-2 text-right">Avg results</th><th scope="col" class="p-2 text-right">Click-through</th></tr></thead>
              <tbody class="divide-y divide-border">
                @for (row of r.top; track row.term) {
                  <tr><th scope="row" class="p-2 font-normal">{{ row.term }}</th><td class="p-2 text-right">{{ row.searches }}</td><td class="p-2 text-right">{{ row.avgResults }}</td><td class="p-2 text-right">{{ row.clickThroughPercent }}%</td></tr>
                } @empty {
                  <tr><td colspan="4" class="p-3 text-text-muted">No searches in this period.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </section>
        <section aria-labelledby="zero-h">
          <h2 id="zero-h" class="mb-1 text-lg font-semibold">Searches with no results</h2>
          <p class="mb-2 text-sm text-text-muted">Open one to see exactly what a shopper sees, then fix it with a synonym or by adding the product.</p>
          <div class="overflow-x-auto rounded-lg border border-border">
            <table class="w-full min-w-[22rem] text-left text-sm">
              <caption class="sr-only">Searches with no results</caption>
              <thead class="bg-surface-alt"><tr><th scope="col" class="p-2">Search</th><th scope="col" class="p-2 text-right">Searches</th></tr></thead>
              <tbody class="divide-y divide-border">
                @for (row of r.zeroResults; track row.term) {
                  <tr>
                    <th scope="row" class="p-2 font-normal"><a [href]="searchUrl(row.term)" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">{{ row.term }}<span class="sr-only"> (opens the shop's search in a new tab)</span></a></th>
                    <td class="p-2 text-right">{{ row.searches }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="2" class="p-3 text-text-muted">Every search found something.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-48" />
    }
  `,
})
export class SearchAnalyticsPageComponent {
  private readonly api = inject(AdminAnalyticsApi);
  private readonly list = injectListParams();
  private readonly config = inject(APP_CONFIG);
  protected readonly days = computed(() => this.list.num('days', 30));
  protected readonly resource = rxResource({ params: () => this.days(), stream: ({ params }) => this.api.search(params) });

  constructor() {
    inject(SeoService).set({ title: 'Search analytics', noindex: true });
  }

  /** The shop's own search page for a term. The term is URL-encoded, so it cannot change the path. */
  protected searchUrl(term: string): string {
    return `${(this.config.storefrontUrl ?? '').replace(/\/$/, '')}/search?q=${encodeURIComponent(term)}`;
  }
}

/** Orders by campaign, first touch and last touch (AN-05). */
@Component({
  selector: 'adm-campaigns',
  imports: [MoneyPipe, ExportBarComponent, ErrorStateComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <adm-export-bar report="campaigns" [days]="days()" />
    <p class="mb-3 max-w-2xl text-sm text-text-muted">Each order is tagged with the first and the last campaign (from <code>utm_source</code>, <code>utm_medium</code>, <code>utm_campaign</code> in the link) the shopper arrived through, when they accepted analytics. Orders with no campaign count as “direct”.</p>
    @if (resource.hasValue()) {
      <div class="overflow-x-auto rounded-lg border border-border">
        <table class="w-full min-w-[40rem] text-left text-sm">
          <caption class="sr-only">Orders by campaign for the last {{ days() }} days</caption>
          <thead class="bg-surface-alt"><tr><th scope="col" class="p-2">Campaign</th><th scope="col" class="p-2 text-right">Orders, first touch</th><th scope="col" class="p-2 text-right">Orders, last touch</th><th scope="col" class="p-2 text-right">Item revenue, last touch</th></tr></thead>
          <tbody class="divide-y divide-border">
            @for (r of resource.value(); track r.campaign) {
              <tr><th scope="row" class="p-2 font-normal">{{ r.campaign }}</th><td class="p-2 text-right">{{ r.firstTouchOrders }}</td><td class="p-2 text-right">{{ r.lastTouchOrders }}</td><td class="p-2 text-right">{{ money(r.lastTouchRevenue) | money }}</td></tr>
            } @empty {
              <tr><td colspan="4" class="p-3 text-text-muted">No orders in this period.</td></tr>
            }
          </tbody>
        </table>
      </div>
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-48" />
    }
  `,
})
export class CampaignsPageComponent {
  private readonly api = inject(AdminAnalyticsApi);
  private readonly list = injectListParams();
  protected readonly money = money;
  protected readonly days = computed(() => this.list.num('days', 30));
  protected readonly resource = rxResource({ params: () => this.days(), stream: ({ params }) => this.api.campaigns(params) });

  constructor() {
    inject(SeoService).set({ title: 'Campaigns', noindex: true });
  }
}

/** Weekly buyer cohorts and how many came back (AN-04). */
@Component({
  selector: 'adm-cohorts',
  imports: [DatePipe, ExportBarComponent, ErrorStateComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <adm-export-bar report="cohorts" [days]="days()" />
    <p class="mb-3 max-w-2xl text-sm text-text-muted">Each row is the group of anonymous visitors who placed their first order that week. The columns show the share of them who ordered again in each following week. Blank cells have not happened yet. The period selector does not apply here.</p>
    @if (resource.hasValue()) {
      <div class="overflow-x-auto rounded-lg border border-border">
        <table class="w-full min-w-[34rem] text-left text-sm">
          <caption class="sr-only">Weekly buyer cohorts and retention</caption>
          <thead class="bg-surface-alt">
            <tr>
              <th scope="col" class="p-2">First order week</th>
              <th scope="col" class="p-2 text-right">Buyers</th>
              @for (c of resource.value(); track $index) {
                <th scope="col" class="p-2 text-right">Week {{ $index }}</th>
              }
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            @for (row of resource.value(); track row.weekStart) {
              <tr>
                <th scope="row" class="p-2 font-normal">{{ row.weekStart | date: 'd MMM y' }}</th>
                <td class="p-2 text-right">{{ row.size }}</td>
                @for (p of row.retentionPercent; track $index) {
                  <td class="p-2 text-right" [style.background]="p === null ? null : 'color-mix(in srgb, var(--color-primary) ' + p * 0.4 + '%, transparent)'">{{ p === null ? '' : p + '%' }}</td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-48" />
    }
  `,
})
export class CohortsPageComponent {
  private readonly api = inject(AdminAnalyticsApi);
  private readonly list = injectListParams();
  protected readonly days = computed(() => this.list.num('days', 30));
  protected readonly resource = rxResource({ stream: () => this.api.cohorts() });

  constructor() {
    inject(SeoService).set({ title: 'Cohorts', noindex: true });
  }
}
