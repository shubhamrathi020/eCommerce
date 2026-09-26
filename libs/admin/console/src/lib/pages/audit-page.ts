import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { SeoService } from '@ecom/shared/core';
import { AuditApi } from '@ecom/shared/data-access';
import { ButtonComponent, EmptyStateComponent, ErrorStateComponent, InputDirective, PaginationComponent, SkeletonComponent } from '@ecom/shared/ui';
import { injectListParams } from '../list-params';

@Component({
  selector: 'adm-audit',
  imports: [DatePipe, ButtonComponent, EmptyStateComponent, ErrorStateComponent, InputDirective, PaginationComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-4 text-2xl font-bold">Audit log</h1>
    <form class="mb-4 flex items-end gap-3" role="search" aria-label="Search the audit log" (submit)="search($event)">
      <div>
        <label for="q" class="mb-1 block text-sm font-medium">Search</label>
        <input id="q" uiInput type="search" placeholder="Who, what or which item" [value]="q() ?? ''" (input)="draft.set($any($event.target).value)" />
      </div>
      <button uiButton type="submit" variant="secondary">Search</button>
    </form>

    @if (resource.hasValue()) {
      @let page = resource.value();
      @if (page.items.length === 0) {
        <ui-empty-state title="No audit entries" description="Changes made in this console show up here." />
      } @else {
        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full min-w-[40rem] text-left text-sm">
            <caption class="sr-only">Audit log</caption>
            <thead class="bg-surface-alt"><tr><th scope="col" class="p-2">When</th><th scope="col" class="p-2">Who</th><th scope="col" class="p-2">Action</th><th scope="col" class="p-2">Item</th><th scope="col" class="p-2">Detail</th></tr></thead>
            <tbody class="divide-y divide-border">
              @for (a of page.items; track a.id) {
                <tr><td class="p-2 text-text-muted">{{ a.at | date: 'd MMM y, h:mm a' }}</td><td class="p-2">{{ a.actor }}</td><td class="p-2 font-mono text-xs">{{ a.action }}</td><td class="p-2">{{ a.target }}</td><td class="p-2 text-text-muted">{{ a.detail }}</td></tr>
              }
            </tbody>
          </table>
        </div>
        <p class="mt-2 text-sm text-text-muted" aria-live="polite">{{ page.total }} entries</p>
        <ui-pagination class="mt-4" [page]="page.page" [pageSize]="page.pageSize" [total]="page.total" />
      }
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-32" />
    }
  `,
})
export class AuditPageComponent {
  private readonly api = inject(AuditApi);
  protected readonly list = injectListParams();
  protected readonly q = computed(() => this.list.str('q'));
  protected readonly draft = signal('');
  protected readonly resource = rxResource({ params: () => ({ q: this.q(), page: this.list.num('page', 1), pageSize: 20 }), stream: ({ params }) => this.api.list(params) });

  constructor() {
    inject(SeoService).set({ title: 'Audit log', noindex: true });
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
