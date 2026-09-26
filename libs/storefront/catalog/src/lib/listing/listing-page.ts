import { ChangeDetectionStrategy, Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { RESPONSE_INIT } from '@angular/core';
import { SeoService } from '@ecom/shared/core';
import { CatalogApi } from '@ecom/shared/data-access';
import type { ListingQuery, ListingResult } from '@ecom/shared/models';
import { ApiException } from '@ecom/shared/models';
import { BreadcrumbComponent, ButtonComponent, ChipComponent, DrawerComponent, EmptyStateComponent, ErrorStateComponent, InputDirective, NotFoundComponent, PaginationComponent, ProductCardComponent, SkeletonComponent } from '@ecom/shared/ui';
import { ShopperActions } from '../shopper-actions';
import { RecentlyViewedComponent } from '../recently-viewed/recently-viewed';
import { DEFAULT_PAGE_SIZE, SORT_OPTIONS, isRefined, parseListingParams, toQueryParams, type UrlListingState } from '../listing-url';
import { FilterPanelComponent, type PriceRange } from './filter-panel';

export type ListingKind = 'category' | 'brand' | 'collection' | 'search';

/** Category, brand, collection and search results. The URL is the single source of truth for filters, sort and page. */
@Component({
  selector: 'app-listing-page',
  imports: [BreadcrumbComponent, ButtonComponent, ChipComponent, DrawerComponent, EmptyStateComponent, ErrorStateComponent, InputDirective, NotFoundComponent, PaginationComponent, ProductCardComponent, SkeletonComponent, FilterPanelComponent, NotFoundComponent, RecentlyViewedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (notFound()) {
      <ui-not-found />
    } @else {
      @if (shown(); as r) {
        @if (r.breadcrumb.length) {
          <ui-breadcrumb class="mb-3" [items]="crumbs()" />
        }
        <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 class="text-2xl font-bold md:text-3xl">{{ r.title }}</h1>
            <p class="text-sm text-text-muted" aria-live="polite">{{ r.total }} {{ r.total === 1 ? 'product' : 'products' }}</p>
          </div>
          <div class="flex items-center gap-2">
            <button uiButton variant="secondary" type="button" class="lg:hidden" (click)="filtersOpen.set(true)">Filters@if (activeCount() > 0) { ({{ activeCount() }}) }</button>
            <label class="sr-only" for="sort">Sort by</label>
            <select id="sort" uiInput class="!w-auto" [value]="state().sort" (change)="setSort($any($event.target).value)">
              @for (option of sortOptions; track option.value) {
                <option [value]="option.value" [selected]="option.value === state().sort">{{ option.label }}</option>
              }
            </select>
          </div>
        </div>

        @if (chips().length) {
          <div class="mb-4 flex flex-wrap items-center gap-2" aria-label="Active filters" role="group">
            @for (chip of chips(); track chip.id) {
              <ui-chip [label]="chip.label" (remove)="removeChip(chip)">{{ chip.label }}</ui-chip>
            }
            <button type="button" class="min-h-11 px-2 text-sm font-medium text-primary hover:underline" (click)="clearAll()">Clear all</button>
          </div>
        }

        <div class="grid gap-6 lg:grid-cols-[16rem_1fr]">
          <aside class="hidden lg:block" aria-label="Filters">
            <app-filter-panel [facets]="r.facets" [priceBounds]="r.priceBounds" [priceMin]="state().priceMin" [priceMax]="state().priceMax" (optionToggle)="toggleOption($event.key, $event.value)" (price)="setPrice($event)" />
          </aside>

          <section aria-label="Products" [attr.aria-busy]="result.isLoading()">
            @if (r.items.length) {
              <ul class="grid grid-cols-2 gap-3 transition-opacity md:grid-cols-3 md:gap-4 xl:grid-cols-4" [class.opacity-50]="result.isLoading()">
                @for (product of r.items; track product.id; let i = $index) {
                  <li>
                    <ui-product-card
                      class="h-full"
                      [product]="product"
                      [priority]="i < 4"
                      [wishlisted]="actions.wishlistIds().includes(product.id)"
                      [comparing]="actions.compareIds().includes(product.id)"
                      (wishlistToggle)="actions.toggleWishlist(product)"
                      (compareToggle)="actions.toggleCompare(product)"
                      (quickAdd)="actions.quickAdd(product)"
                    />
                  </li>
                }
              </ul>
              <ui-pagination class="mt-8" [page]="r.page" [pageSize]="r.pageSize" [total]="r.total" />
            } @else {
              <ui-empty-state title="No products match your filters" description="Try removing a filter or searching for something else.">
                <button uiButton variant="secondary" type="button" (click)="clearAll()">Clear all filters</button>
              </ui-empty-state>
            }
          </section>
        </div>

        <ui-drawer [(open)]="filtersOpen" label="Filters" side="left">
          <app-filter-panel [facets]="r.facets" [priceBounds]="r.priceBounds" [priceMin]="state().priceMin" [priceMax]="state().priceMax" (optionToggle)="toggleOption($event.key, $event.value)" (price)="setPrice($event)" />
          <button uiButton type="button" class="mt-4 w-full" (click)="filtersOpen.set(false)">Show {{ r.total }} results</button>
        </ui-drawer>

        <app-recently-viewed class="mt-12" />
      } @else if (result.status() === 'error') {
        <ui-error-state (retry)="result.reload()" />
      } @else {
        <ui-skeleton class="mb-4 h-8 w-1/3" />
        <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          @for (n of skeletons; track n) {
            <ui-skeleton class="aspect-[3/4]" />
          }
        </div>
      }
    }
  `,
})
export class ListingPageComponent {
  /** Route data / path params (bound through `withComponentInputBinding`). */
  readonly kind = input.required<ListingKind>();
  readonly slug = input<string>();

  private readonly api = inject(CatalogApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly response = inject(RESPONSE_INIT, { optional: true });
  protected readonly actions = inject(ShopperActions);

  protected readonly sortOptions = SORT_OPTIONS;
  protected readonly skeletons = Array.from({ length: 8 }, (_, i) => i);
  protected readonly filtersOpen = signal(false);

  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  protected readonly state = computed<UrlListingState>(() => parseListingParams(this.params()));

  private readonly query = computed<ListingQuery>(() => {
    const s = this.state();
    const scope: Partial<ListingQuery> = {};
    if (this.kind() === 'category') scope.categorySlug = this.slug();
    if (this.kind() === 'brand') scope.brandSlug = this.slug();
    if (this.kind() === 'collection') scope.collectionSlug = this.slug();
    return { ...s, ...scope, pageSize: DEFAULT_PAGE_SIZE };
  });

  protected readonly result = rxResource({ params: () => this.query(), stream: ({ params }) => this.api.listing(params) });

  /** Keeps the previous page on screen while the next one loads, avoiding a flash of skeletons. */
  protected readonly shown = linkedSignal<ListingResult | undefined, ListingResult | undefined>({
    source: () => (this.result.hasValue() ? this.result.value() : undefined),
    computation: (next, previous) => next ?? previous?.value,
  });

  protected readonly notFound = computed(() => {
    const error = this.result.error();
    return this.result.status() === 'error' && error instanceof ApiException && error.code === 'not_found';
  });

  protected readonly crumbs = computed(() => {
    const r = this.shown();
    if (!r) return [];
    return [{ label: 'Home', link: '/' }, ...r.breadcrumb.map((c, i, all) => (i === all.length - 1 ? { label: c.name } : { label: c.name, link: `/c/${c.slug}` }))];
  });

  protected readonly chips = computed(() => {
    const r = this.shown();
    const s = this.state();
    if (!r) return [];
    const chips: { id: string; label: string; key: string; value?: string }[] = [];
    for (const facet of r.facets) {
      for (const option of facet.options) {
        if (option.selected) chips.push({ id: `${facet.key}:${option.value}`, label: `${facet.label}: ${option.label}`, key: facet.key, value: option.value });
      }
    }
    if (s.priceMin !== undefined || s.priceMax !== undefined) {
      chips.push({ id: 'price', label: `Price: ₹${s.priceMin !== undefined ? Math.round(s.priceMin / 100) : 0} - ${s.priceMax !== undefined ? '₹' + Math.round(s.priceMax / 100) : 'any'}`, key: 'price' });
    }
    return chips;
  });

  protected readonly activeCount = computed(() => this.chips().length);

  constructor() {
    effect(() => {
      const r = this.shown();
      const s = this.state();
      if (!r) return;
      const base = this.basePath();
      this.seo.set({
        title: r.title + (s.page > 1 ? ` - Page ${s.page}` : ''),
        description: `Shop ${r.title} online. ${r.total} products with fast delivery and easy returns.`,
        path: s.page > 1 ? `${base}?page=${s.page}` : base,
        noindex: isRefined(s) || this.kind() === 'search',
      });
    });
    effect(() => {
      if (this.notFound() && this.response) this.response.status = 404;
    });
  }

  private basePath(): string {
    const prefix = { category: '/c', brand: '/b', collection: '/collections', search: '/search' }[this.kind()];
    return this.kind() === 'search' ? prefix : `${prefix}/${this.slug()}`;
  }

  private update(next: UrlListingState): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: toQueryParams(next, this.params().keys), replaceUrl: false });
  }

  protected setSort(value: string): void {
    this.update({ ...this.state(), sort: value as UrlListingState['sort'], page: 1 });
  }

  protected toggleOption(key: string, value: string): void {
    const s = this.state();
    const current = s.filters[key] ?? [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    this.update({ ...s, filters: { ...s.filters, [key]: next }, page: 1 });
  }

  protected setPrice(range: PriceRange): void {
    this.update({ ...this.state(), priceMin: range.min !== undefined ? range.min * 100 : undefined, priceMax: range.max !== undefined ? range.max * 100 : undefined, page: 1 });
  }

  protected removeChip(chip: { key: string; value?: string }): void {
    if (chip.key === 'price') this.update({ ...this.state(), priceMin: undefined, priceMax: undefined, page: 1 });
    else if (chip.value) this.toggleOption(chip.key, chip.value);
  }

  protected clearAll(): void {
    const s = this.state();
    this.update({ filters: {}, sort: s.sort, page: 1, q: s.q });
  }
}
