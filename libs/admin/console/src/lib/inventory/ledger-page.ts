import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { SeoService } from '@ecom/shared/core';
import { AdminInventoryApi } from '@ecom/shared/data-access';
import type { MovementKind, MovementQuery } from '@ecom/shared/models';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, InputDirective, PaginationComponent, SkeletonComponent } from '@ecom/shared/ui';
import { injectListParams } from '../list-params';

const PAGE_SIZE = 25;
const KINDS: MovementKind[] = ['receive', 'sale', 'cancellation', 'return', 'damage', 'correction', 'transfer'];

/** Read-only stock ledger: every movement ever recorded, newest first. Entries can never be edited or removed. */
@Component({
  selector: 'adm-inventory-ledger',
  imports: [DatePipe, BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, InputDirective, PaginationComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="mb-4 text-sm text-text-muted">Every stock change is appended here with who made it and why. Entries are permanent: a mistake is fixed with a new correcting entry.</p>
    <form class="mb-4 flex flex-wrap items-end gap-3" role="search" aria-label="Filter the ledger" (submit)="search($event)">
      <div>
        <label for="lq" class="mb-1 block text-sm font-medium">Search</label>
        <input id="lq" uiInput type="search" placeholder="SKU, product, reason, person or order" [value]="q() ?? ''" (input)="draft.set($any($event.target).value)" />
      </div>
      <div>
        <label for="lk" class="mb-1 block text-sm font-medium">Kind</label>
        <select id="lk" uiInput (change)="list.patch({ kind: $any($event.target).value || null })">
          <option value="">All kinds</option>
          @for (k of kinds; track k) {
            <option [value]="k" [selected]="kind() === k">{{ k }}</option>
          }
        </select>
      </div>
      <button uiButton type="submit" variant="secondary">Search</button>
    </form>

    @if (resource.hasValue()) {
      @let data = resource.value();
      @if (data.items.length === 0) {
        <ui-empty-state title="No movements yet" description="Sales, cancellations and adjustments will appear here." />
      } @else {
        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full min-w-[52rem] text-left text-sm">
            <caption class="sr-only">Stock movements</caption>
            <thead class="bg-surface-alt">
              <tr>
                <th scope="col" class="p-2">When</th>
                <th scope="col" class="p-2">Kind</th>
                <th scope="col" class="p-2">Product</th>
                <th scope="col" class="p-2">Location</th>
                <th scope="col" class="p-2 text-right">Units</th>
                <th scope="col" class="p-2">Reason</th>
                <th scope="col" class="p-2">By</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              @for (m of data.items; track m.id) {
                <tr>
                  <td class="whitespace-nowrap p-2 text-text-muted">{{ m.at | date: 'd MMM y, h:mm a' }}</td>
                  <td class="p-2"><ui-badge [tone]="m.quantity < 0 ? 'warning' : 'success'">{{ m.kind }}</ui-badge></td>
                  <td class="p-2"><span class="block max-w-xs truncate" [attr.title]="m.title">{{ m.title }}</span><span class="text-xs text-text-muted">{{ m.sku }}</span></td>
                  <td class="p-2">{{ locationName(m.locationId) }}</td>
                  <td class="p-2 text-right font-medium" [class.text-danger]="m.quantity < 0">{{ m.quantity > 0 ? '+' : '' }}{{ m.quantity }}</td>
                  <td class="p-2">{{ reasonText(m.reason) }}@if (m.orderId) { <span class="block text-xs text-text-muted">Order {{ m.orderId }}</span> }@if (m.note) { <span class="block text-xs text-text-muted">{{ m.note }}</span> }</td>
                  <td class="p-2 text-text-muted">{{ m.actor }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p class="mt-2 text-sm text-text-muted" aria-live="polite">{{ data.total }} movements</p>
        <ui-pagination class="mt-4" [page]="data.page" [pageSize]="data.pageSize" [total]="data.total" />
      }
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-48" />
    }
  `,
})
export class LedgerPageComponent {
  private readonly api = inject(AdminInventoryApi);
  protected readonly list = injectListParams();
  protected readonly kinds = KINDS;

  protected readonly q = computed(() => this.list.str('q'));
  protected readonly kind = computed(() => this.list.str('kind') as MovementKind | undefined);
  protected readonly draft = signal('');
  private readonly query = computed<MovementQuery>(() => ({ q: this.q(), kind: this.kind(), page: this.list.num('page', 1), pageSize: PAGE_SIZE }));

  protected readonly resource = rxResource({ params: () => this.query(), stream: ({ params }) => this.api.movements(params) });
  private readonly locationResource = rxResource({ stream: () => this.api.locations() });

  constructor() {
    inject(SeoService).set({ title: 'Stock ledger', noindex: true });
    effect(() => {
      this.q();
      untracked(() => this.draft.set(this.q() ?? ''));
    });
  }

  protected search(event: Event): void {
    event.preventDefault();
    this.list.patch({ q: this.draft().trim() || null });
  }

  protected locationName(id: string): string {
    return (this.locationResource.hasValue() ? this.locationResource.value() : []).find((l) => l.id === id)?.name ?? id;
  }

  /** `order_placed` becomes "order placed". */
  protected reasonText(reason: string): string {
    const text = reason.replace(/_/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}
