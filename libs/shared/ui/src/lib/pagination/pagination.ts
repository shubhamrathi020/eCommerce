import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type PageItem = number | 'gap';

/** Builds a compact page list such as 1 … 4 5 6 … 20. Pure so it can be unit tested. */
export function pageItems(page: number, pages: number): PageItem[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const items: PageItem[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);
  if (start > 2) items.push('gap');
  for (let p = start; p <= end; p++) items.push(p);
  if (end < pages - 1) items.push('gap');
  items.push(pages);
  return items;
}

/** Crawlable page links: each page is a real link that merges `?page=n` into the current query. */
@Component({
  selector: 'ui-pagination',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (pages() > 1) {
      <nav aria-label="Pagination">
        <ul class="flex flex-wrap items-center justify-center gap-1">
          <li>
            @if (page() > 1) {
              <a [routerLink]="[]" [queryParams]="{ page: page() - 1 }" queryParamsHandling="merge" rel="prev" class="inline-flex min-h-11 items-center rounded-md px-3 hover:bg-surface-alt">Previous</a>
            }
          </li>
          @for (item of items(); track $index) {
            <li>
              @if (item === 'gap') {
                <span class="px-2 text-text-muted" aria-hidden="true">…</span>
              } @else {
                <a
                  [routerLink]="[]"
                  [queryParams]="{ page: item === 1 ? null : item }"
                  queryParamsHandling="merge"
                  class="inline-flex size-11 items-center justify-center rounded-md hover:bg-surface-alt"
                  [class]="item === page() ? 'bg-primary font-semibold text-primary-contrast hover:bg-primary' : ''"
                  [attr.aria-current]="item === page() ? 'page' : null"
                  [attr.aria-label]="'Page ' + item"
                  >{{ item }}</a
                >
              }
            </li>
          }
          <li>
            @if (page() < pages()) {
              <a [routerLink]="[]" [queryParams]="{ page: page() + 1 }" queryParamsHandling="merge" rel="next" class="inline-flex min-h-11 items-center rounded-md px-3 hover:bg-surface-alt">Next</a>
            }
          </li>
        </ul>
      </nav>
    }
  `,
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly total = input.required<number>();

  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  protected readonly items = computed(() => pageItems(this.page(), this.pages()));
}
