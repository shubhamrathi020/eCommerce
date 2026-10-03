import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { LocaleDatePipe, SeoService, ToastService } from '@ecom/shared/core';
import { AdminNotificationApi } from '@ecom/shared/data-access';
import type { DeliveryQuery, DeliveryStatus } from '@ecom/shared/models';
import { ApiException } from '@ecom/shared/models';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, InputDirective, PaginationComponent, SkeletonComponent } from '@ecom/shared/ui';
import { injectListParams } from '../list-params';

const PAGE_SIZE = 25;

/** Every message the platform has sent, with a reason and a retry for failures. */
@Component({
  selector: 'adm-delivery-log',
  imports: [LocaleDatePipe, BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, InputDirective, PaginationComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="mb-4 flex flex-wrap items-end gap-3" role="search" aria-label="Filter the delivery log" (submit)="search($event)">
      <div>
        <label for="dq" class="mb-1 block text-sm font-medium">Search</label>
        <input id="dq" uiInput type="search" placeholder="Recipient, subject or template" [value]="q() ?? ''" (input)="draft.set($any($event.target).value)" />
      </div>
      <div>
        <label for="ds" class="mb-1 block text-sm font-medium">Status</label>
        <select id="ds" uiInput (change)="list.patch({ status: $any($event.target).value || null })">
          <option value="">All</option>
          <option value="sent" [selected]="status() === 'sent'">Sent</option>
          <option value="failed" [selected]="status() === 'failed'">Failed</option>
        </select>
      </div>
      <button uiButton type="submit" variant="secondary">Search</button>
    </form>

    @if (resource.hasValue()) {
      @let data = resource.value();
      @if (data.items.length === 0) {
        <ui-empty-state title="Nothing sent yet" description="Order, review and alert emails will show up here." />
      } @else {
        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full min-w-[46rem] text-start text-sm">
            <caption class="sr-only">Delivery log</caption>
            <thead class="bg-surface-alt">
              <tr>
                <th scope="col" class="p-2">When</th>
                <th scope="col" class="p-2">To</th>
                <th scope="col" class="p-2">Subject</th>
                <th scope="col" class="p-2">Status</th>
                <th scope="col" class="p-2"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              @for (e of data.items; track e.id) {
                <tr>
                  <td class="whitespace-nowrap p-2 text-text-muted">{{ e.at | date: 'd MMM y, h:mm a' }}</td>
                  <td class="p-2">{{ e.to }}</td>
                  <td class="p-2">
                    <span class="block max-w-xs truncate" [attr.title]="e.subject">{{ e.subject }}</span>
                    @if (e.reason) {
                      <span class="block text-xs text-danger">{{ e.reason }}</span>
                    }
                    @if (e.attempts > 1) {
                      <span class="block text-xs text-text-muted">{{ e.attempts }} attempts</span>
                    }
                  </td>
                  <td class="p-2"><ui-badge [tone]="e.status === 'sent' ? 'success' : 'danger'">{{ e.status }}</ui-badge></td>
                  <td class="p-2 text-end">
                    @if (e.status === 'failed') {
                      <button type="button" class="min-h-11 px-2 font-medium text-primary hover:underline" [disabled]="retrying() === e.id" (click)="retry(e.id)">{{ retrying() === e.id ? 'Retrying…' : 'Retry' }}</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p class="mt-2 text-sm text-text-muted" aria-live="polite">{{ data.total }} messages</p>
        <ui-pagination class="mt-4" [page]="data.page" [pageSize]="data.pageSize" [total]="data.total" />
      }
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-48" />
    }
  `,
})
export class DeliveryLogPageComponent {
  private readonly api = inject(AdminNotificationApi);
  private readonly toast = inject(ToastService);
  protected readonly list = injectListParams();

  protected readonly q = computed(() => this.list.str('q'));
  protected readonly status = computed(() => this.list.str('status') as DeliveryStatus | undefined);
  protected readonly draft = signal('');
  private readonly query = computed<DeliveryQuery>(() => ({ q: this.q(), status: this.status(), page: this.list.num('page', 1), pageSize: PAGE_SIZE }));

  protected readonly resource = rxResource({ params: () => this.query(), stream: ({ params }) => this.api.deliveryLog(params) });
  protected readonly retrying = signal<string | null>(null);

  constructor() {
    inject(SeoService).set({ title: 'Delivery log', noindex: true });
    effect(() => {
      this.q();
      untracked(() => this.draft.set(this.q() ?? ''));
    });
  }

  protected search(event: Event): void {
    event.preventDefault();
    this.list.patch({ q: this.draft().trim() || null });
  }

  protected async retry(id: string): Promise<void> {
    this.retrying.set(id);
    try {
      await firstValueFrom(this.api.retry(id));
      this.toast.success('Message resent');
      this.resource.reload();
    } catch (e) {
      this.toast.error(e instanceof ApiException ? e.message : 'Could not retry that message.');
    } finally {
      this.retrying.set(null);
    }
  }
}
