import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LocaleDatePipe, SeoService, ToastService } from '@ecom/shared/core';
import { AdminProductApi } from '@ecom/shared/data-access';
import type { AdminProductQuery, ProductStatus } from '@ecom/contracts';
import { ApiException } from '@ecom/contracts';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, InputDirective, PaginationComponent, SkeletonComponent } from '@ecom/shared/ui';
import { MoneyPipe } from '@ecom/shared/util';
import { injectListParams } from '../list-params';

const PAGE_SIZE = 20;
const TONES = { published: 'success', draft: 'warning', archived: 'neutral' } as const;

@Component({
  selector: 'adm-products',
  imports: [LocaleDatePipe, NgOptimizedImage, RouterLink, MoneyPipe, BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, InputDirective, PaginationComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">Products</h1>
      <a uiButton routerLink="/products/new">New product</a>
    </div>

    <form class="mb-4 flex flex-wrap items-end gap-3" role="search" aria-label="Filter products" (submit)="search($event)">
      <div>
        <label for="q" class="mb-1 block text-sm font-medium">Search</label>
        <input id="q" uiInput type="search" placeholder="Title, brand or SKU" [value]="q() ?? ''" (input)="draft.set($any($event.target).value)" />
      </div>
      <div>
        <label for="status" class="mb-1 block text-sm font-medium">Status</label>
        <select id="status" uiInput (change)="list.patch({ status: $any($event.target).value || null })">
          <option value="">All</option>
          @for (s of statuses; track s) {
            <option [value]="s" [selected]="status() === s">{{ s }}</option>
          }
        </select>
      </div>
      <div>
        <label for="sort" class="mb-1 block text-sm font-medium">Sort by</label>
        <select id="sort" uiInput (change)="setSort($any($event.target).value)">
          @for (o of sorts; track o.value) {
            <option [value]="o.value" [selected]="sortKey() === o.value">{{ o.label }}</option>
          }
        </select>
      </div>
      <button uiButton type="submit" variant="secondary">Search</button>
    </form>

    @if (selected().size > 0) {
      <div class="mb-3 flex flex-wrap items-center gap-2 rounded-md bg-surface-alt p-3" role="region" aria-label="Bulk actions">
        <span class="text-sm font-medium" aria-live="polite">{{ selected().size }} selected</span>
        <button uiButton size="sm" type="button" (click)="bulk('published')">Publish</button>
        <button uiButton size="sm" variant="secondary" type="button" (click)="bulk('archived')">Archive</button>
        @if (!confirmDelete()) {
          <button uiButton size="sm" variant="danger" type="button" (click)="confirmDelete.set(true)">Delete drafts</button>
        } @else {
          <button uiButton size="sm" variant="danger" type="button" (click)="deleteDrafts()">Confirm: delete selected drafts</button>
          <button uiButton size="sm" variant="ghost" type="button" (click)="confirmDelete.set(false)">Cancel</button>
        }
        <button uiButton size="sm" variant="ghost" type="button" (click)="selected.set(emptySet)">Clear selection</button>
      </div>
    }

    @if (resource.hasValue()) {
      @let page = resource.value();
      @if (page.items.length === 0) {
        <ui-empty-state title="No products found" description="Try a different search or filter." />
      } @else {
        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full min-w-[46rem] text-start text-sm">
            <caption class="sr-only">Products</caption>
            <thead class="bg-surface-alt">
              <tr>
                <th scope="col" class="w-10 p-2"><input type="checkbox" class="size-5 accent-primary" aria-label="Select all on this page" [checked]="allSelected()" (change)="toggleAll(page.items)" /></th>
                <th scope="col" class="p-2">Product</th>
                <th scope="col" class="p-2">Status</th>
                <th scope="col" class="p-2 text-end">From price</th>
                <th scope="col" class="p-2 text-end">Stock</th>
                <th scope="col" class="p-2">Updated</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              @for (row of page.items; track row.id) {
                <tr>
                  <td class="p-2"><input type="checkbox" class="size-5 accent-primary" [attr.aria-label]="'Select ' + row.title" [checked]="selected().has(row.id)" (change)="toggle(row.id)" /></td>
                  <td class="p-2">
                    <div class="flex items-center gap-3">
                      <img [ngSrc]="row.image.url" width="40" height="40" alt="" class="size-10 rounded object-cover" />
                      <span class="min-w-0">
                        <a [routerLink]="['/products', row.id]" class="block truncate font-medium text-primary hover:underline">{{ row.title }}</a>
                        <span class="text-xs text-text-muted">{{ row.brandName }} · {{ row.categoryName }} · {{ row.variantCount }} variant(s)</span>
                      </span>
                    </div>
                  </td>
                  <td class="p-2"><ui-badge [tone]="tone(row.status)">{{ row.status }}</ui-badge></td>
                  <td class="p-2 text-end">{{ row.priceMin | money }}</td>
                  <td class="p-2 text-end" [class.text-danger]="row.stockTotal === 0">{{ row.stockTotal }}</td>
                  <td class="p-2 text-text-muted">{{ row.updatedAt | date: 'd MMM y' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p class="mt-2 text-sm text-text-muted" aria-live="polite">{{ page.total }} products</p>
        <ui-pagination class="mt-4" [page]="page.page" [pageSize]="page.pageSize" [total]="page.total" />
      }
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-48" />
    }
  `,
})
export class ProductsPageComponent {
  private readonly api = inject(AdminProductApi);
  private readonly toast = inject(ToastService);
  protected readonly list = injectListParams();

  protected readonly statuses: ProductStatus[] = ['published', 'draft', 'archived'];
  protected readonly sorts = [
    { value: 'updated:desc', label: 'Recently updated' },
    { value: 'title:asc', label: 'Title A to Z' },
    { value: 'price:asc', label: 'Price low to high' },
    { value: 'price:desc', label: 'Price high to low' },
    { value: 'stock:asc', label: 'Stock low to high' },
  ];
  protected readonly emptySet = new Set<string>();

  protected readonly q = computed(() => this.list.str('q'));
  protected readonly status = computed(() => this.list.str('status') as ProductStatus | undefined);
  protected readonly sortKey = computed(() => `${this.list.str('sort') ?? 'updated'}:${this.list.str('dir') ?? 'desc'}`);
  protected readonly draft = signal('');
  protected readonly selected = signal(new Set<string>());
  protected readonly confirmDelete = signal(false);

  private readonly query = computed<AdminProductQuery>(() => {
    const [sort, dir] = this.sortKey().split(':') as [AdminProductQuery['sort'], 'asc' | 'desc'];
    return { q: this.q(), status: this.status(), sort, dir, page: this.list.num('page', 1), pageSize: PAGE_SIZE };
  });

  protected readonly resource = rxResource({ params: () => this.query(), stream: ({ params }) => this.api.list(params) });
  protected readonly allSelected = computed(() => {
    const items = this.resource.hasValue() ? this.resource.value().items : [];
    return items.length > 0 && items.every((i) => this.selected().has(i.id));
  });

  constructor() {
    inject(SeoService).set({ title: 'Products', noindex: true });
    effect(() => {
      this.q();
      untracked(() => this.draft.set(this.q() ?? ''));
    });
  }

  protected tone(status: ProductStatus) {
    return TONES[status];
  }

  protected search(event: Event): void {
    event.preventDefault();
    this.list.patch({ q: this.draft().trim() || null });
  }

  protected setSort(value: string): void {
    const [sort, dir] = value.split(':');
    this.list.patch({ sort, dir });
  }

  protected toggle(id: string): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  protected toggleAll(items: { id: string }[]): void {
    this.selected.update((set) => {
      const next = new Set(set);
      const all = items.every((i) => next.has(i.id));
      for (const i of items) {
        if (all) next.delete(i.id);
        else next.add(i.id);
      }
      return next;
    });
  }

  protected async bulk(status: ProductStatus): Promise<void> {
    await this.run(() => firstValueFrom(this.api.bulkSetStatus([...this.selected()], status)), (n) => `${n} product(s) set to ${status}`);
  }

  protected async deleteDrafts(): Promise<void> {
    this.confirmDelete.set(false);
    await this.run(() => firstValueFrom(this.api.bulkDeleteDrafts([...this.selected()])), (n) => `${n} draft product(s) deleted (only drafts can be deleted)`);
  }

  private async run(action: () => Promise<number>, message: (n: number) => string): Promise<void> {
    try {
      this.toast.success(message(await action()));
      this.selected.set(this.emptySet);
      this.resource.reload();
    } catch (e) {
      this.toast.error(e instanceof ApiException ? e.message : 'The action failed.');
    }
  }
}
