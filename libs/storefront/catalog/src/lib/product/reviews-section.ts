import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LocaleDatePipe, ToastService } from '@ecom/shared/core';
import { CatalogApi, ReviewApi } from '@ecom/shared/data-access';
import type { RatingSummary, Review, ReviewSort } from '@ecom/shared/models';
import { ApiException } from '@ecom/shared/models';
import { AuthStore } from '@ecom/shared/state';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, InputDirective, RatingComponent, SkeletonComponent } from '@ecom/shared/ui';
import { ReviewFormComponent } from './review-form';

const PAGE_SIZE = 5;

/** Rating breakdown, review list (sort, load more, helpful votes) and the write/edit flow for verified buyers. */
@Component({
  selector: 'app-reviews-section',
  imports: [LocaleDatePipe, RouterLink, BadgeComponent, ButtonComponent, EmptyStateComponent, InputDirective, RatingComponent, ReviewFormComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section class="mb-6" aria-labelledby="write-h">
      <h3 id="write-h" class="mb-2 font-semibold">Write a review</h3>
      @if (message()) {
        <p class="mb-3 rounded-md border border-success p-3 text-sm" role="status">{{ message() }}</p>
      }
      @if (eligibility.hasValue()) {
        @let e = eligibility.value();
        @if (formOpen()) {
          <app-review-form [productId]="productId()" [existing]="editing() ? e.existing : undefined" (saved)="onSaved($event)" (cancelled)="formOpen.set(false)" />
        } @else if (e.existing; as mine) {
          <div class="rounded-lg border border-border p-3">
            <p class="mb-1 flex flex-wrap items-center gap-2 text-sm font-medium">Your review <ui-badge [tone]="mine.status === 'pending' ? 'warning' : 'success'">{{ mine.status === 'pending' ? 'Waiting for moderation' : 'Published' }}</ui-badge></p>
            <ui-rating [value]="mine.rating" [size]="14" />
            <p class="font-medium">{{ mine.title }}</p>
            <p class="text-sm">{{ mine.body }}</p>
            <div class="mt-2 flex gap-1">
              <button type="button" class="min-h-11 px-2 text-sm font-medium text-primary hover:underline" (click)="startEdit()">Edit</button>
              <button type="button" class="min-h-11 px-2 text-sm font-medium text-danger hover:underline" (click)="remove(mine)">Delete</button>
            </div>
          </div>
        } @else if (e.canReview) {
          <button uiButton variant="secondary" type="button" (click)="startNew()">Write a review</button>
        } @else if (e.reason === 'sign_in') {
          <p class="text-sm text-text-muted"><a routerLink="/account/login" [queryParams]="{ returnUrl: currentUrl() }" class="font-medium text-primary hover:underline">Sign in</a> to review products you have bought.</p>
        } @else {
          <p class="text-sm text-text-muted">Only customers who bought this product can review it.</p>
        }
      } @else {
        <ui-skeleton class="h-10" />
      }
    </section>

    @if (liveSummary().count === 0) {
      <ui-empty-state title="No reviews yet" description="Be the first to review this product after you buy it." />
    } @else {
      <div class="grid gap-6 md:grid-cols-[14rem_1fr]">
        <div>
          <p class="text-4xl font-bold">{{ liveSummary().average.toFixed(1) }}<span class="text-lg font-normal text-text-muted"> / 5</span></p>
          <ui-rating [value]="liveSummary().average" [count]="liveSummary().count" [size]="18" />
          <ul class="mt-3 space-y-1" aria-label="Rating breakdown">
            @for (row of breakdown(); track row.stars) {
              <li class="flex items-center gap-2 text-sm">
                <span class="w-12 text-text-muted">{{ row.stars }} star</span>
                <span class="h-2 flex-1 overflow-hidden rounded-full bg-surface-alt"><span class="block h-full bg-accent" [style.width.%]="row.percent"></span></span>
                <span class="w-8 text-end text-text-muted">{{ row.count }}</span>
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
                  @if (review.mine) {
                    <ui-badge tone="primary">Your review</ui-badge>
                  }
                  @if (review.status === 'pending') {
                    <ui-badge tone="warning">Waiting for moderation</ui-badge>
                  }
                </div>
                <p class="mt-1 text-text">{{ review.body }}</p>
                <p class="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-muted">
                  <span>{{ review.author }}</span>
                  <span>{{ review.createdAt | date: 'd MMM y' }}</span>
                  @if (review.verified) {
                    <ui-badge tone="success">Verified purchase</ui-badge>
                  }
                </p>
                @if (!review.mine) {
                  <button type="button" class="mt-1 inline-flex min-h-11 items-center rounded-md border border-border-strong px-3 text-sm hover:bg-surface-alt" [attr.aria-pressed]="!!review.voted" (click)="vote(review)">
                    {{ review.voted ? 'Marked helpful' : 'Helpful' }} ({{ review.helpful }})<span class="sr-only"> for review “{{ review.title }}”</span>
                  </button>
                } @else {
                  <p class="mt-1 text-sm text-text-muted">{{ review.helpful }} found this helpful</p>
                }
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

  private readonly catalog = inject(CatalogApi);
  private readonly reviewApi = inject(ReviewApi);
  private readonly auth = inject(AuthStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  private readonly sort = signal<ReviewSort>('recent');
  private readonly pageNo = signal(1);
  /** Bumped after any change so the list and the eligibility check reload. */
  private readonly version = signal(0);

  protected readonly message = signal('');
  protected readonly formOpen = signal(false);
  protected readonly editing = signal(false);

  protected readonly eligibility = rxResource({
    params: () => ({ id: this.productId(), user: this.auth.user()?.id ?? null, version: this.version() }),
    stream: ({ params }) => this.reviewApi.eligibility(params.id),
  });

  protected readonly page = rxResource({
    params: () => ({ id: this.productId(), sort: this.sort(), page: this.pageNo(), user: this.auth.user()?.id ?? null, version: this.version() }),
    stream: ({ params }) => this.catalog.reviews(params.id, { sort: params.sort, page: params.page, pageSize: PAGE_SIZE }),
  });

  /** Reviews loaded so far: page 1 replaces the list, later pages are appended. */
  protected readonly loaded = signal<Review[]>([]);
  protected readonly liveSummary = computed(() => (this.page.hasValue() ? this.page.value().summary : this.summary()));

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
    const { distribution, count } = this.liveSummary();
    return [5, 4, 3, 2, 1].map((stars) => ({ stars, count: distribution[stars - 1], percent: count ? (distribution[stars - 1] / count) * 100 : 0 }));
  });

  protected currentUrl(): string {
    return this.router.url;
  }

  protected setSort(value: string): void {
    this.sort.set(value as ReviewSort);
    this.pageNo.set(1);
  }

  protected loadMore(): void {
    this.pageNo.update((n) => n + 1);
  }

  protected startNew(): void {
    this.message.set('');
    this.editing.set(false);
    this.formOpen.set(true);
  }

  protected startEdit(): void {
    this.message.set('');
    this.editing.set(true);
    this.formOpen.set(true);
  }

  protected onSaved(review: Review): void {
    this.formOpen.set(false);
    this.message.set(review.status === 'pending' ? 'Thanks! Your review is waiting for moderation and will appear once approved.' : 'Thanks! Your review is now live.');
    this.pageNo.set(1);
    this.version.update((v) => v + 1);
  }

  protected async remove(review: Review): Promise<void> {
    try {
      await firstValueFrom(this.reviewApi.removeMine(review.id));
      this.message.set('Your review was deleted.');
      this.pageNo.set(1);
      this.version.update((v) => v + 1);
    } catch (e) {
      this.toast.error(e instanceof ApiException ? e.message : 'Could not delete your review.');
    }
  }

  protected async vote(review: Review): Promise<void> {
    if (!this.auth.loggedIn()) {
      this.toast.info('Sign in to mark reviews as helpful.');
      return;
    }
    try {
      const result = await firstValueFrom(this.reviewApi.vote(review.id));
      this.loaded.update((list) => list.map((r) => (r.id === review.id ? { ...r, voted: result.voted, helpful: (review.helpful - (review.voted ? 1 : 0)) + (result.voted ? 1 : 0) } : r)));
    } catch (e) {
      this.toast.error(e instanceof ApiException ? e.message : 'Could not save your vote.');
    }
  }
}
