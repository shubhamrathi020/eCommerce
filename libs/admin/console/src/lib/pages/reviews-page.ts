import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { LocaleDatePipe, SeoService, ToastService } from '@ecom/shared/core';
import { AdminReviewApi } from '@ecom/shared/data-access';
import type { AdminReviewRow } from '@ecom/shared/models';
import { ApiException } from '@ecom/shared/models';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, InputDirective, PaginationComponent, RatingComponent, SkeletonComponent } from '@ecom/shared/ui';
import { injectListParams } from '../list-params';

const TONES = { pending: 'warning', approved: 'success', rejected: 'danger' } as const;

/** Reviews held by the automatic checks. Text is shown as plain text (never as HTML). */
@Component({
  selector: 'adm-reviews',
  imports: [LocaleDatePipe, BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, InputDirective, PaginationComponent, RatingComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-4 text-2xl font-bold">Review moderation</h1>
    <div class="mb-4">
      <label for="status" class="mb-1 block text-sm font-medium">Show</label>
      <select id="status" uiInput class="!w-auto" (change)="list.patch({ status: $any($event.target).value || null })">
        <option value="pending" [selected]="status() === 'pending'">Waiting for moderation</option>
        <option value="approved" [selected]="status() === 'approved'">Approved</option>
        <option value="rejected" [selected]="status() === 'rejected'">Rejected</option>
      </select>
    </div>

    @if (resource.hasValue()) {
      @let page = resource.value();
      @if (page.items.length === 0) {
        <ui-empty-state title="Nothing here" description="No reviews in this state." />
      } @else {
        <ul class="space-y-3">
          @for (r of page.items; track r.id) {
            <li class="rounded-lg border border-border p-4">
              <div class="flex flex-wrap items-center gap-2">
                <ui-rating [value]="r.rating" [size]="14" />
                <span class="font-medium">{{ r.title }}</span>
                <ui-badge [tone]="tone(r.status)">{{ r.status }}</ui-badge>
                @if (r.flagReason) {
                  <ui-badge tone="warning">{{ r.flagReason }}</ui-badge>
                }
              </div>
              <p class="mt-1 text-sm">{{ r.body }}</p>
              <p class="mt-1 text-xs text-text-muted">{{ r.author }} on “{{ r.productTitle }}” · {{ r.createdAt | date: 'd MMM y' }}</p>
              <div class="mt-2 flex flex-wrap gap-2">
                @if (r.status !== 'approved') {
                  <button uiButton size="sm" type="button" (click)="decide(r, 'approved')">Approve<span class="sr-only"> review “{{ r.title }}”</span></button>
                }
                @if (r.status !== 'rejected') {
                  <button uiButton size="sm" variant="secondary" type="button" (click)="decide(r, 'rejected')">Reject<span class="sr-only"> review “{{ r.title }}”</span></button>
                }
                <button uiButton size="sm" variant="ghost" type="button" (click)="remove(r)">Delete<span class="sr-only"> review “{{ r.title }}”</span></button>
              </div>
            </li>
          }
        </ul>
        <p class="mt-2 text-sm text-text-muted" aria-live="polite">{{ page.total }} reviews</p>
        <ui-pagination class="mt-4" [page]="page.page" [pageSize]="page.pageSize" [total]="page.total" />
      }
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-32" />
    }
  `,
})
export class ReviewsPageComponent {
  private readonly api = inject(AdminReviewApi);
  private readonly toast = inject(ToastService);
  protected readonly list = injectListParams();
  protected readonly status = computed<AdminReviewRow['status']>(() => (this.list.str('status') as AdminReviewRow['status'] | undefined) ?? 'pending');
  protected readonly resource = rxResource({ params: () => ({ status: this.status(), page: this.list.num('page', 1), pageSize: 20 }), stream: ({ params }) => this.api.list(params) });

  constructor() {
    inject(SeoService).set({ title: 'Reviews', noindex: true });
  }

  protected tone(status: AdminReviewRow['status']) {
    return TONES[status];
  }

  private async run(action: () => Promise<unknown>, message: string): Promise<void> {
    try {
      await action();
      this.toast.success(message);
      this.resource.reload();
    } catch (e) {
      this.toast.error(e instanceof ApiException ? e.message : 'The action failed.');
    }
  }

  protected decide(r: AdminReviewRow, decision: 'approved' | 'rejected'): Promise<void> {
    return this.run(() => firstValueFrom(this.api.moderate(r.id, decision)), `Review ${decision}`);
  }

  protected remove(r: AdminReviewRow): Promise<void> {
    return this.run(() => firstValueFrom(this.api.remove(r.id)), 'Review deleted');
  }
}
