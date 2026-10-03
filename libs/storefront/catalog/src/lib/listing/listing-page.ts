import { ChangeDetectionStrategy, Component, computed, effect, inject, input, linkedSignal, signal, untracked } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink, Scroll } from '@angular/router';
import { RESPONSE_INIT } from '@angular/core';
import { filter } from 'rxjs';
import { AnalyticsService, RecentSearchesStore, SeoService } from '@ecom/shared/core';
import { CatalogApi, SearchApi } from '@ecom/shared/data-access';
import type { ListingQuery, ListingResult, ProductSummary, SortKey } from '@ecom/contracts';
import { ApiException } from '@ecom/contracts';
import { BreadcrumbComponent, ButtonComponent, ChipComponent, DrawerComponent, EmptyStateComponent, ErrorStateComponent, InputDirective, NotFoundComponent, PaginationComponent, ProductCardComponent, SkeletonComponent } from '@ecom/shared/ui';
import { ShopperActions } from '../shopper-actions';
import { RecentlyViewedComponent } from '../recently-viewed/recently-viewed';
import { DEFAULT_PAGE_SIZE, SORT_OPTIONS, isRefined, parseListingParams, toQueryParams, type UrlListingState } from '../listing-url';
import { FilterPanelComponent, type PriceRange } from './filter-panel';

export type ListingKind = 'category' | 'brand' | 'collection' | 'search';

/** Category, brand, collection and search results. The URL is the single source of truth for filters, sort and page. */
@Component({
  selector: 'app-listing-page',
  imports: [RouterLink, BreadcrumbComponent, ButtonComponent, ChipComponent, DrawerComponent, EmptyStateComponent, ErrorStateComponent, InputDirective, NotFoundComponent, PaginationComponent, ProductCardComponent, SkeletonComponent, FilterPanelComponent, NotFoundComponent, RecentlyViewedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(click)': 'resultClicked($event)' },
  template: `
    @if (notFound()) {
      <ui-not-found />
    } @else {
      @if (shown(); as r) {
        @if (r.breadcrumb.length) {
          <ui-breadcrumb class="mb-3" [items]="crumbs()" />
        }
        @if (r.correctedFrom) {
          <p class="mb-3 rounded-md bg-surface-alt p-3 text-sm" role="status">No exact matches for “{{ r.correctedFrom }}”. Showing the closest results instead.</p>
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
              @for (option of sortOptions(); track option.value) {
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
              <ul class="grid grid-cols-2 gap-3 transition-opacity md:grid-cols-3 md:gap-4 xl:grid-cols-4" [class.opacity-50]="result.isLoading()" data-results>
                @for (product of listItems(); track product.id) {
                  <li>
                    <ui-product-card
                      class="h-full"
                      [product]="product"
                      [priority]="priorityIds().has(product.id)"
                      [wishlisted]="actions.wishlistIds().includes(product.id)"
                      [comparing]="actions.compareIds().includes(product.id)"
                      (wishlistToggle)="actions.toggleWishlist(product)"
                      (compareToggle)="actions.toggleCompare(product)"
                      (quickAdd)="actions.quickAdd(product)"
                    />
                  </li>
                }
              </ul>
              <ui-pagination class="mt-8 hidden lg:block" [page]="r.page" [pageSize]="r.pageSize" [total]="r.total" />
              @if (r.page < pages()) {
                <a
                  uiButton
                  variant="secondary"
                  class="mt-8 block w-full text-center lg:hidden"
                  [routerLink]="[]"
                  [queryParams]="{ page: r.page + 1 }"
                  queryParamsHandling="merge"
                  (click)="rememberScroll()"
                  [attr.aria-busy]="result.isLoading()"
                >
                  {{ result.isLoading() ? 'Loading…' : 'Load more' }}
                </a>
              } @else if (listItems().length > r.pageSize) {
                <p class="mt-8 text-center text-sm text-text-muted lg:hidden">You've seen every result.</p>
              }
            } @else {
              <ui-empty-state [title]="kind() === 'search' && !activeCount() ? 'No results for “' + (state().q ?? '') + '”' : 'No products match your filters'" description="Check the spelling, try a more general word, or remove a filter.">
                @if (activeCount() > 0) {
                  <button uiButton variant="secondary" type="button" (click)="clearAll()">Clear all filters</button>
                }
                @if (kind() === 'search' && popular().length) {
                  <p class="mt-4 text-sm font-medium">Popular searches</p>
                  <ul class="mt-2 flex flex-wrap justify-center gap-2">
                    @for (term of popular(); track term) {
                      <li><a [routerLink]="['/search']" [queryParams]="{ q: term }" class="inline-flex min-h-11 items-center rounded-full border border-border-strong px-4 text-sm font-medium hover:bg-surface-alt">{{ term }}</a></li>
                    }
                  </ul>
                }
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
  private readonly analytics = inject(AnalyticsService);
  private readonly searchApi = inject(SearchApi);
  private readonly popularResource = rxResource({ stream: () => this.searchApi.popular() });
  protected readonly popular = computed(() => (this.popularResource.hasValue() ? this.popularResource.value() : []));

  protected readonly defaultSort = computed<SortKey>(() => (this.kind() === 'search' ? 'relevance' : 'featured'));
  protected readonly sortOptions = computed(() => SORT_OPTIONS.filter((o) => o.value !== (this.kind() === 'search' ? 'featured' : 'relevance')));
  protected readonly skeletons = Array.from({ length: 8 }, (_, i) => i);
  protected readonly filtersOpen = signal(false);

  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  protected readonly state = computed<UrlListingState>(() => parseListingParams(this.params(), this.defaultSort()));

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

  protected readonly pages = computed(() => Math.max(1, Math.ceil((this.shown()?.total ?? 0) / (this.shown()?.pageSize ?? 1))));

  /** Same filters, sort and search term, ignoring the page number: identifies "still the same listing". */
  private readonly baseQueryKey = computed(() => {
    const { page: _page, ...rest } = this.query();
    return JSON.stringify(rest);
  });

  /**
   * On mobile, "Load more" keeps appending pages to this instead of replacing them, so the on-screen
   * list grows; a real query change (new filters, sort or search) or a page going backwards (the browser
   * back button) resets it to just that one page, which is the normal, single-page-at-a-time behaviour.
   * `priorityIds` (the above-the-fold images `NgOptimizedImage` should preload) is fixed at that same
   * reset and never changes while appending, so an already-rendered image's `priority` input can never
   * flip after Angular has measured it — that is a runtime error, not just a style choice.
   */
  private readonly accumulated = signal<{ key: string; page: number; items: ProductSummary[]; priorityIds: ReadonlySet<string> }>({ key: '', page: 0, items: [], priorityIds: new Set() });
  protected readonly listItems = computed<ProductSummary[]>(() => {
    const acc = this.accumulated();
    return acc.key === this.baseQueryKey() && acc.items.length ? acc.items : (this.shown()?.items ?? []);
  });
  protected readonly priorityIds = computed(() => this.accumulated().priorityIds);

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

  private pendingScrollY: number | null = null;

  constructor() {
    // Builds the accumulated mobile "Load more" list; see `accumulated` above for the reset rules.
    effect(() => {
      if (!this.result.hasValue()) return;
      const r = this.result.value();
      const key = this.baseQueryKey();
      const page = this.state().page;
      untracked(() =>
        this.accumulated.update((acc) => {
          const append = acc.key === key && page === acc.page + 1;
          return { key, page, items: append ? [...acc.items, ...r.items] : r.items, priorityIds: append ? acc.priorityIds : new Set(r.items.slice(0, 4).map((p) => p.id)) };
        }),
      );
    });
    // "Load more" is a real link (crawlable, works without JS); this only stops the router's normal
    // scroll-to-top for that one navigation, so the shopper stays where they were.
    this.router.events.pipe(filter((e): e is Scroll => e instanceof Scroll)).subscribe(() => {
      if (this.pendingScrollY === null) return;
      const y = this.pendingScrollY;
      this.pendingScrollY = null;
      requestAnimationFrame(() => window.scrollTo(0, y));
    });

    effect(() => {
      const r = this.shown();
      const s = this.state();
      if (!r) return;
      const base = this.basePath();
      this.seo.set({
        title: r.title + (s.page > 1 ? ` - Page ${s.page}` : ''),
        description: `Shop ${r.title} online. ${r.total} products with fast delivery and easy returns.`,
        path: s.page > 1 ? `${base}?page=${s.page}` : base,
        noindex: isRefined(s, this.defaultSort()) || this.kind() === 'search',
      });
    });
    effect(() => {
      if (this.notFound() && this.response) this.response.status = 404;
    });
    // Search analytics: term is length-limited and only sent with consent (see AnalyticsService).
    effect(() => {
      const r = this.shown();
      const term = this.state().q;
      if (this.kind() !== 'search' || !r || !term) return;
      untracked(() => this.analytics.track({ name: r.total === 0 ? 'search_zero_results' : 'search', props: { term: term.slice(0, 50), results: r.total } }));
    });
  }

  /** A click on a product link in search results counts toward the term's click-through rate (BRD 16). */
  protected resultClicked(event: Event): void {
    const term = this.state().q;
    if (this.kind() !== 'search' || !term) return;
    // Only links inside the results grid count, not header or filter links.
    const link = (event.target as HTMLElement | null)?.closest('[data-results] a[href^="/p/"]');
    if (link) this.analytics.track({ name: 'search_result_click', props: { term: term.slice(0, 50) } });
  }

  private basePath(): string {
    const prefix = { category: '/c', brand: '/b', collection: '/collections', search: '/search' }[this.kind()];
    return this.kind() === 'search' ? prefix : `${prefix}/${this.slug()}`;
  }

  private update(next: UrlListingState): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: toQueryParams(next, this.params().keys, this.defaultSort()), replaceUrl: false });
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

  protected rememberScroll(): void {
    this.pendingScrollY = window.scrollY;
  }

  protected clearAll(): void {
    const s = this.state();
    this.update({ filters: {}, sort: s.sort, page: 1, q: s.q });
  }
}
