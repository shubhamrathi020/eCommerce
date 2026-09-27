import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, linkedSignal, untracked } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { RESPONSE_INIT } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CART_FACADE, CompareStore, RecentlyViewedStore, SeoService, ToastService, WishlistStore } from '@ecom/shared/core';
import { AlertApi, CatalogApi, CategoryApi, LOW_STOCK_THRESHOLD } from '@ecom/shared/data-access';
import type { AlertKind, AttributeDef, CategoryNode, Product, Variant } from '@ecom/shared/models';
import { ApiException } from '@ecom/shared/models';
import { AuthStore } from '@ecom/shared/state';
import { firstValueFrom } from 'rxjs';
import { BadgeComponent, BreadcrumbComponent, ButtonComponent, ErrorStateComponent, GalleryComponent, NotFoundComponent, PriceComponent, QuantityStepperComponent, RatingComponent, SkeletonComponent, TabDirective, TabsComponent } from '@ecom/shared/ui';
import { signal } from '@angular/core';
import { ProductRowComponent } from '../product-row/product-row';
import { RecentlyViewedComponent } from '../recently-viewed/recently-viewed';
import { DeliveryCheckComponent } from './delivery-check';
import { ReviewsSectionComponent } from './reviews-section';

type Selection = Record<string, string>;

/** The variant shown when the URL does not name one: the first in stock, else the first. */
const defaultVariant = (p: Product): Variant => p.variants.find((v) => v.stock > 0) ?? p.variants[0];

function flatten(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((n) => [n, ...flatten(n.children)]);
}

/** Product detail page: gallery, variant picker, price/stock, delivery check, tabs, related products. */
@Component({
  selector: 'app-product-page',
  imports: [
    DatePipe,
    BadgeComponent,
    BreadcrumbComponent,
    ButtonComponent,
    ErrorStateComponent,
    GalleryComponent,
    NotFoundComponent,
    PriceComponent,
    QuantityStepperComponent,
    RatingComponent,
    SkeletonComponent,
    TabDirective,
    TabsComponent,
    ProductRowComponent,
    RecentlyViewedComponent,
    DeliveryCheckComponent,
    ReviewsSectionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (notFound()) {
      <ui-not-found />
    } @else if (product(); as p) {
      <ui-breadcrumb class="mb-4" [items]="crumbs()" />
      <div class="grid gap-8 lg:grid-cols-2">
        <ui-gallery [images]="images()" />

        <div class="space-y-5">
          <div>
            <p class="text-sm font-medium uppercase tracking-wide text-text-muted">{{ p.brandName }}</p>
            <h1 class="text-2xl font-bold md:text-3xl">{{ p.title }}</h1>
            @if (p.rating.count > 0) {
              <ui-rating class="mt-1" [value]="p.rating.average" [count]="p.rating.count" [size]="18" />
            }
          </div>

          @if (variant(); as v) {
            <div>
              <ui-price class="text-2xl" [price]="v.price" [mrp]="v.mrp" />
              <p class="text-xs text-text-muted">Inclusive of all taxes</p>
            </div>
            <p aria-live="polite">
              @if (v.stock === 0 && v.backorder) {
                <ui-badge tone="warning">Backorder</ui-badge>
                <span class="ml-2 text-sm">{{ v.backorder.expectedDate ? 'Ships around ' + (v.backorder.expectedDate | date: 'd MMM y') : 'Ships when it is back in stock' }}</span>
              } @else if (v.stock === 0) {
                <ui-badge tone="danger">Out of stock</ui-badge>
              } @else if (v.stock <= lowStock) {
                <ui-badge tone="warning">Only {{ v.stock }} left</ui-badge>
              } @else {
                <ui-badge tone="success">In stock</ui-badge>
              }
              <span class="ml-2 text-sm text-text-muted">SKU {{ v.sku }}</span>
            </p>
          }

          @for (axis of p.variantAxes; track axis) {
            <fieldset>
              <legend class="mb-2 text-sm font-medium">{{ axisLabel(axis) }}: <span class="font-normal text-text-muted">{{ selection()[axis] }}</span></legend>
              <div class="flex flex-wrap gap-2" role="radiogroup" [attr.aria-label]="axisLabel(axis)">
                @for (value of axisValues(p, axis); track value) {
                  <button
                    type="button"
                    role="radio"
                    class="min-h-11 min-w-11 rounded-md border px-3 text-sm font-medium"
                    [class]="optionClass(p, axis, value)"
                    [attr.aria-checked]="selection()[axis] === value"
                    [attr.aria-label]="value + (optionOutOfStock(p, axis, value) ? ' (out of stock)' : '')"
                    [disabled]="optionOutOfStock(p, axis, value)"
                    (click)="choose(p, axis, value)"
                  >
                    {{ value }}
                  </button>
                }
              </div>
            </fieldset>
          }

          <div class="flex flex-wrap items-center gap-3">
            <ui-quantity-stepper [(value)]="quantity" [max]="maxQuantity()" />
            <button uiButton type="button" class="flex-1 md:flex-none" [disabled]="!canBuy()" (click)="addToCart(p)">Add to cart</button>
            <button uiButton variant="secondary" type="button" [disabled]="!canBuy()" (click)="buyNow(p)">Buy now</button>
          </div>
          <div class="flex flex-wrap gap-3">
            <button uiButton variant="ghost" type="button" [attr.aria-pressed]="wishlisted()" (click)="toggleWishlist(p)">{{ wishlisted() ? 'Saved to wishlist' : 'Add to wishlist' }}</button>
            <button uiButton variant="ghost" type="button" [attr.aria-pressed]="comparing()" (click)="toggleCompare(p)">{{ comparing() ? 'Remove from compare' : 'Compare' }}</button>
            @if (auth.loggedIn() && variant(); as v) {
              @if (v.stock === 0 && !v.backorder) {
                <button uiButton variant="ghost" type="button" [attr.aria-pressed]="isSubscribed('back_in_stock')" [loading]="alertBusy() === 'back_in_stock'" (click)="toggleAlert('back_in_stock', v.id)">{{ isSubscribed('back_in_stock') ? "You'll be notified when it's back" : 'Notify me when back in stock' }}</button>
              }
              <button uiButton variant="ghost" type="button" [attr.aria-pressed]="isSubscribed('price_drop')" [loading]="alertBusy() === 'price_drop'" (click)="toggleAlert('price_drop', v.id)">{{ isSubscribed('price_drop') ? "You'll be alerted on a price drop" : 'Alert me on price drop' }}</button>
            }
          </div>

          <app-delivery-check />

          <section aria-label="Offers" class="rounded-lg border border-border p-3 text-sm">
            <h2 class="mb-1 font-semibold">Offers</h2>
            <ul class="list-disc space-y-1 pl-5 text-text-muted">
              <li>Extra 5% off with UPI payments</li>
              <li>Free delivery on orders above ₹499</li>
              <li>Easy 7-day returns on eligible items</li>
            </ul>
          </section>

          @if (p.highlights.length) {
            <section aria-label="Highlights">
              <h2 class="mb-1 font-semibold">Highlights</h2>
              <ul class="list-disc space-y-1 pl-5 text-text-muted">
                @for (h of p.highlights; track h) {
                  <li>{{ h }}</li>
                }
              </ul>
            </section>
          }
        </div>
      </div>

      <ui-tabs class="mt-10" label="Product information">
        <ng-template uiTab="Description">
          <div class="max-w-3xl space-y-3 text-text" [innerHTML]="p.description"></div>
        </ng-template>
        <ng-template uiTab="Specifications">
          <table class="w-full max-w-3xl text-left text-sm">
            <caption class="sr-only">Specifications</caption>
            <tbody class="divide-y divide-border">
              @for (row of specs(); track row.label) {
                <tr>
                  <th scope="row" class="w-1/3 py-2 pr-4 font-medium text-text-muted">{{ row.label }}</th>
                  <td class="py-2">{{ row.value }}</td>
                </tr>
              }
            </tbody>
          </table>
        </ng-template>
        <ng-template [uiTab]="'Reviews (' + p.rating.count + ')'">
          <app-reviews-section [productId]="p.id" [summary]="p.rating" />
        </ng-template>
      </ui-tabs>

      <div class="mt-12 space-y-10">
        <app-product-row title="Frequently bought together" [items]="together()" />
        <app-product-row title="Related products" [items]="related()" />
        <app-recently-viewed [excludeId]="p.id" />
      </div>

      <div class="fixed inset-x-0 bottom-0 z-10 flex items-center gap-3 border-t border-border bg-surface p-3 md:hidden">
        @if (variant(); as v) {
          <ui-price class="flex-1" [price]="v.price" [mrp]="v.mrp" />
        }
        <button uiButton type="button" [disabled]="!canBuy()" (click)="addToCart(p)">Add to cart</button>
      </div>
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <div class="grid gap-8 lg:grid-cols-2">
        <ui-skeleton class="aspect-square" />
        <div class="space-y-3">
          <ui-skeleton class="h-8 w-3/4" />
          <ui-skeleton class="h-6 w-1/3" />
          <ui-skeleton class="h-12 w-full" />
        </div>
      </div>
    }
  `,
})
export class ProductPageComponent {
  /** Bound from the `:slug` route parameter. */
  readonly slug = input.required<string>();

  private readonly api = inject(CatalogApi);
  private readonly categoryApi = inject(CategoryApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly toast = inject(ToastService);
  private readonly cart = inject(CART_FACADE);
  private readonly wishlist = inject(WishlistStore);
  private readonly compare = inject(CompareStore);
  private readonly recent = inject(RecentlyViewedStore);
  private readonly response = inject(RESPONSE_INIT, { optional: true });
  private readonly alertApi = inject(AlertApi);
  protected readonly auth = inject(AuthStore);

  protected readonly lowStock = LOW_STOCK_THRESHOLD;
  private readonly variantParam = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  protected readonly resource = rxResource({ params: () => this.slug(), stream: ({ params }) => this.api.product(params) });
  private readonly categories = rxResource({ stream: () => this.categoryApi.tree() });

  protected readonly product = computed<Product | undefined>(() => (this.resource.hasValue() ? this.resource.value().product : undefined));
  protected readonly notFound = computed(() => {
    const error = this.resource.error();
    return this.resource.status() === 'error' && error instanceof ApiException && error.code === 'not_found';
  });

  /** Option selection per axis; resets to the requested (or first available) variant when the product changes. */
  protected readonly selection = linkedSignal<Product | undefined, Selection>({
    source: () => this.product(),
    computation: (p) => {
      if (!p) return {};
      const wanted = p.variants.find((v) => v.id === this.variantParam().get('variant'));
      return { ...(wanted ?? defaultVariant(p)).options };
    },
  });

  protected readonly quantity = signal(1);

  protected readonly variant = computed<Variant | undefined>(() => {
    const p = this.product();
    const sel = this.selection();
    return p?.variants.find((v) => p.variantAxes.every((axis) => v.options[axis] === sel[axis]));
  });
  protected readonly images = computed(() => this.variant()?.images ?? this.product()?.images ?? []);
  protected readonly maxQuantity = computed(() => (this.variant()?.backorder ? 10 : Math.max(1, Math.min(10, this.variant()?.stock ?? 1))));
  protected readonly canBuy = computed(() => (this.variant()?.stock ?? 0) > 0 || !!this.variant()?.backorder);
  protected readonly wishlisted = computed(() => {
    const p = this.product();
    return !!p && this.wishlist.ids().includes(p.id);
  });
  protected readonly comparing = computed(() => {
    const p = this.product();
    return !!p && this.compare.ids().includes(p.id);
  });

  private readonly alertsResource = rxResource({ params: () => (this.auth.loggedIn() ? true : undefined), stream: () => this.alertApi.list() });
  protected readonly alertBusy = signal<AlertKind | null>(null);
  protected isSubscribed(kind: AlertKind): boolean {
    const v = this.variant();
    return !!v && (this.alertsResource.hasValue() ? this.alertsResource.value() : []).some((a) => a.kind === kind && a.variantId === v.id);
  }

  protected readonly crumbs = computed(() => {
    const p = this.product();
    if (!p) return [];
    return [{ label: 'Home', link: '/' }, ...p.categoryPath.map((c) => ({ label: c.name, link: `/c/${c.slug}` })), { label: p.title }];
  });

  private readonly attributeDefs = computed<AttributeDef[]>(() => {
    const p = this.product();
    if (!p || !this.categories.hasValue()) return [];
    return flatten(this.categories.value()).find((c) => c.id === p.categoryId)?.attributeDefs ?? [];
  });

  protected readonly specs = computed(() => {
    const p = this.product();
    if (!p) return [];
    const defs = new Map(this.attributeDefs().map((d) => [d.key, d]));
    return [
      { label: 'Brand', value: p.brandName },
      ...Object.entries(p.attributes).map(([key, value]) => ({ label: defs.get(key)?.label ?? key, value: String(value) })),
    ];
  });

  protected readonly relatedResource = rxResource({ params: () => this.product()?.id, stream: ({ params }) => this.api.related(params) });
  protected readonly togetherResource = rxResource({ params: () => this.product()?.id, stream: ({ params }) => this.api.boughtTogether(params) });
  protected readonly related = computed(() => (this.relatedResource.hasValue() ? this.relatedResource.value() : []));
  protected readonly together = computed(() => (this.togetherResource.hasValue() ? this.togetherResource.value() : []));

  constructor() {
    effect(() => {
      if (this.resource.hasValue()) {
        const { product, redirectedFrom } = this.resource.value();
        if (redirectedFrom) void this.router.navigate(['/p', product.slug], { replaceUrl: true, queryParamsHandling: 'preserve' });
      }
    });

    effect(() => {
      const p = this.product();
      if (!p) return;
      untracked(() => this.recent.add(p.id));
      const v = this.variant();
      const stock = p.variants.some((x) => x.stock > 0);
      const prices = p.variants.map((x) => x.price.amount);
      const low = Math.min(...prices) / 100;
      const high = Math.max(...prices) / 100;
      this.seo.set({
        title: p.seo?.title ?? p.title,
        description: p.seo?.description ?? `${p.title} by ${p.brandName}. ${p.highlights.slice(0, 3).join(', ')}.`,
        path: `/p/${p.slug}`,
        image: p.images[0]?.url,
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Product',
              name: p.title,
              sku: v?.sku,
              brand: { '@type': 'Brand', name: p.brandName },
              image: p.images.map((i) => i.url),
              description: p.highlights.join('. '),
              ...(p.rating.count ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating.average, reviewCount: p.rating.count } } : {}),
              offers: { '@type': 'AggregateOffer', priceCurrency: 'INR', lowPrice: low, highPrice: high, offerCount: p.variants.length, availability: stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: p.categoryPath.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: `/c/${c.slug}` })),
            },
          ],
        },
      });
    });

    effect(() => {
      if (this.notFound() && this.response) this.response.status = 404;
    });

    // Keep the chosen variant in the URL (shareable) without adding history entries.
    effect(() => {
      const v = this.variant();
      const p = untracked(() => this.product());
      if (!v || !p || untracked(() => this.variantParam().get('variant')) === v.id) return;
      // Nothing to sync while the slug is about to be redirected, or when the default variant is showing.
      if (this.resource.hasValue() && this.resource.value().redirectedFrom) return;
      if (v.id === defaultVariant(p).id && !untracked(() => this.variantParam().has('variant'))) return;
      void this.router.navigate([], { relativeTo: this.route, queryParams: { variant: v.id }, queryParamsHandling: 'merge', replaceUrl: true });
    });

    // Quantity cannot exceed the stock of the newly selected variant.
    effect(() => {
      const max = this.maxQuantity();
      untracked(() => {
        if (this.quantity() > max) this.quantity.set(max);
      });
    });
  }

  protected axisLabel(axis: string): string {
    return this.attributeDefs().find((d) => d.key === axis)?.label ?? axis.charAt(0).toUpperCase() + axis.slice(1);
  }

  protected axisValues(p: Product, axis: string): string[] {
    const def = this.attributeDefs().find((d) => d.key === axis);
    const present = [...new Set(p.variants.map((v) => v.options[axis]))];
    return def?.values ? def.values.filter((v) => present.includes(v)) : present;
  }

  protected optionOutOfStock(p: Product, axis: string, value: string): boolean {
    return !p.variants.some((v) => v.options[axis] === value && (v.stock > 0 || v.backorder));
  }

  protected optionClass(p: Product, axis: string, value: string): string {
    if (this.selection()[axis] === value) return 'border-primary bg-primary text-primary-contrast';
    if (this.optionOutOfStock(p, axis, value)) return 'border-border text-text-muted line-through opacity-60';
    return 'border-border-strong hover:bg-surface-alt';
  }

  /** Picks the variant with this option that agrees with the most other current choices, preferring in-stock ones. */
  protected choose(p: Product, axis: string, value: string): void {
    const sel = this.selection();
    const score = (v: Variant) => p.variantAxes.filter((a) => a !== axis && v.options[a] === sel[a]).length;
    const best = p.variants
      .filter((v) => v.options[axis] === value)
      .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || score(b) - score(a))[0];
    if (best) this.selection.set({ ...best.options });
  }

  protected addToCart(p: Product): void {
    const v = this.variant();
    if (!v || (v.stock === 0 && !v.backorder)) return;
    void this.cart.add({ productId: p.id, variantId: v.id, quantity: this.quantity(), title: p.title });
  }

  /** Adds the item, then goes straight to checkout. */
  protected async buyNow(p: Product): Promise<void> {
    const v = this.variant();
    if (!v || (v.stock === 0 && !v.backorder)) return;
    const added = await this.cart.add({ productId: p.id, variantId: v.id, quantity: this.quantity(), title: p.title, openMiniCart: false });
    if (added) await this.router.navigate(['/checkout']);
  }

  protected toggleWishlist(p: Product): void {
    this.toast.success(this.wishlist.toggle(p.id) ? 'Added to your wishlist' : 'Removed from your wishlist');
  }

  protected toggleCompare(p: Product): void {
    if (this.compare.has(p.id)) this.compare.remove(p.id);
    else if (!this.compare.add(p.id)) this.toast.error(`You can compare up to ${this.compare.limit} products. Remove one first.`);
  }

  protected async toggleAlert(kind: AlertKind, variantId: string): Promise<void> {
    const existing = (this.alertsResource.hasValue() ? this.alertsResource.value() : []).find((a) => a.kind === kind && a.variantId === variantId);
    this.alertBusy.set(kind);
    try {
      if (existing) {
        await firstValueFrom(this.alertApi.remove(existing.id));
        this.toast.info('Alert removed');
      } else {
        await firstValueFrom(this.alertApi.subscribe(kind, variantId));
        this.toast.success(kind === 'back_in_stock' ? "We'll email you when it's back in stock" : "We'll email you if the price drops");
      }
      this.alertsResource.reload();
    } catch (e) {
      this.toast.error(e instanceof ApiException ? e.message : 'Could not save that alert.');
    } finally {
      this.alertBusy.set(null);
    }
  }
}
