import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CART_FACADE, SeoService, ToastService, WishlistStore } from '@ecom/shared/core';
import { CatalogApi } from '@ecom/shared/data-access';
import type { ProductSummary } from '@ecom/shared/models';
import { ButtonComponent, EmptyStateComponent, ProductCardComponent, SkeletonComponent } from '@ecom/shared/ui';

/** Saved products (kept on this device until wishlists move to the server). */
@Component({
  selector: 'app-wishlist-page',
  imports: [RouterLink, ButtonComponent, EmptyStateComponent, ProductCardComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-4 text-2xl font-bold md:text-3xl">Your wishlist</h1>
    @if (store.count() === 0) {
      <ui-empty-state title="Your wishlist is empty" description="Tap the heart on any product to save it here.">
        <a uiButton routerLink="/">Continue shopping</a>
      </ui-empty-state>
    } @else if (!resource.hasValue()) {
      <ui-skeleton class="h-64" />
    } @else {
      <ul class="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
        @for (product of items(); track product.id) {
          <li>
            <ui-product-card class="h-full" [product]="product" [wishlisted]="true" (wishlistToggle)="remove(product)" (compareToggle)="noop()" (quickAdd)="add(product)" />
          </li>
        }
      </ul>
    }
  `,
})
export class WishlistPageComponent {
  protected readonly store = inject(WishlistStore);
  private readonly api = inject(CatalogApi);
  private readonly cart = inject(CART_FACADE);
  private readonly toast = inject(ToastService);

  protected readonly resource = rxResource({ params: () => this.store.ids(), stream: ({ params }) => this.api.summariesByIds(params) });
  /** Keeps the list in the same order as saved, and drops products removed just now. */
  protected readonly items = computed<ProductSummary[]>(() => {
    const ids = new Set(this.store.ids());
    return this.resource.hasValue() ? this.resource.value().filter((p) => ids.has(p.id)) : [];
  });

  constructor() {
    inject(SeoService).set({ title: 'Wishlist', noindex: true, path: '/wishlist' });
  }

  protected remove(product: ProductSummary): void {
    this.store.toggle(product.id);
    this.toast.info('Removed from your wishlist');
  }

  protected add(product: ProductSummary): void {
    if (product.quickAddVariantId) void this.cart.add({ productId: product.id, variantId: product.quickAddVariantId, quantity: 1, title: product.title });
  }

  protected noop(): void {
    // Comparing is done from listings and product pages.
  }
}
