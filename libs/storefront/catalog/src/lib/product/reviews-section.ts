import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CatalogApi } from '@ecom/shared/data-access';
import type { RatingSummary, Review, ReviewSort } from '@ecom/shared/models';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, InputDirective, RatingComponent, SkeletonComponent } from '@ecom/shared/ui';

const PAGE_SIZE = 5;

/** Rating breakdown plus a sortable, "load more" list of reviews. */
@Component({
  selector: 'app-reviews-section',
  imports: [DatePipe, BadgeComponent, ButtonComponent, EmptyStateComponent, InputDirective, RatingComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (summary().count === 0) {
      <ui-empty-state title="No reviews yet" description="Be the first to review this product after you buy it." />
    } @else {
      <div class="grid gap-6 md:grid-cols-[14rem_1fr]">
        <div>
          <p class="text-4xl font-bold">{{ summary().average.toFixed(1) }}<span class="text-lg font-normal text-text-muted"> / 5</span></p>
          <ui-rating [value]="summary().average" [count]="summary().count" [size]="18" />
          <ul class="mt-3 space-y-1" aria-label="Rating breakdown">
            @for (row of breakdown(); track row.stars) {
              <li class="flex items-center gap-2 text-sm">
                <span class="w-12 text-text-muted">{{ row.stars }} star</span>
                <span class="h-2 flex-1 overflow-hidden rounded-full bg-surface-alt"><span class="block h-full bg-accent" [style.width.%]="row.percent"></span></span>
                <span class="w-8 text-right text-text-muted">{{ row.count }}</span>
              </li>
            }
          </ul>
        </div>
        <div>
          <div class="mb-3 flex items-center justify-between">
            <h3 class="font-semibold">Customer reviews</h3>
            <label class="sr-only" for="review-sort">Sort reviews</label>
            <select id="review-sort" uiInput class="!w-auto" (change)="setSort($any($event.target).value)">
              <option value="recent">Most recent</option>
              <option value="helpful">Most helpful</option>
              <option value="high">Highest rated</option>
              <option value="low">Lowest rated</option>
            </select>
          </div>
          <ul class="divide-y divide-border">
            @for (review of loaded(); track review.id) {
              <li class="py-3">
                <div class="flex flex-wrap items-center gap-2">
                  <ui-rating [value]="review.rating" [size]="14" />
                  <span class="font-medium">{{ review.title }}</span>
                </div>
                <p class="mt-1 text-text">{{ review.body }}</p>
                <p class="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-muted">
                  <span>{{ review.author }}</span>
                  <span>{{ review.createdAt | date: 'd MMM y' }}</span>
                  @if (review.verified) {
                    <ui-badge tone="success">Verified purchase</ui-badge>
                  }
                  <span>{{ review.helpful }} found this helpful</span>
                </p>
              </li>
            }
          </ul>
          @if (page.isLoading()) {
            <ui-skeleton class="mt-3 h-16" />
          }
          @if (hasMore()) {
            <button uiButton variant="secondary" type="button" class="mt-3" [loading]="page.isLoading()" (click)="loadMore()">Show more reviews</button>
          }
        </div>
      </div>
    }
  `,
})
export class ReviewsSectionComponent {
  readonly productId = input.required<string>();
  readonly summary = input.required<RatingSummary>();

  private readonly api = inject(CatalogApi);
  private readonly sort = signal<ReviewSort>('recent');
  private readonly pageNo = signal(1);

  protected readonly page = rxResource({
    params: () => ({ id: this.productId(), sort: this.sort(), page: this.pageNo() }),
    stream: ({ params }) => this.api.reviews(params.id, { sort: params.sort, page: params.page, pageSize: PAGE_SIZE }),
  });

  /** Reviews loaded so far: page 1 replaces the list, later pages are appended. */
  protected readonly loaded = signal<Review[]>([]);

  constructor() {
    effect(() => {
      if (!this.page.hasValue()) return;
      const items = this.page.value().items;
      const pageNo = this.pageNo();
      untracked(() => this.loaded.update((prev) => (pageNo === 1 ? items : [...prev, ...items.filter((r) => !prev.some((p) => p.id === r.id))])));
    });
  }

  protected readonly hasMore = computed(() => this.page.hasValue() && this.loaded().length < this.page.value().total);

  protected readonly breakdown = computed(() => {
    const { distribution, count } = this.summary();
    return [5, 4, 3, 2, 1].map((stars) => ({ stars, count: distribution[stars - 1], percent: count ? (distribution[stars - 1] / count) * 100 : 0 }));
  });

  protected setSort(value: string): void {
    this.sort.set(value as ReviewSort);
    this.pageNo.set(1);
  }

  protected loadMore(): void {
    this.pageNo.update((n) => n + 1);
  }
}
