import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ProductSummary } from '@ecom/shared/models';
import { discountPercent } from '@ecom/shared/util';
import { BadgeComponent } from '../badge/badge';
import { IconComponent } from '../icon/icon';
import { PriceComponent } from '../price/price';
import { RatingComponent } from '../rating/rating';

/**
 * Product tile. The whole card is one link target (the title link is stretched over the card);
 * the wishlist, compare and quick-add controls sit above it.
 */
@Component({
  selector: 'ui-product-card',
  imports: [NgOptimizedImage, RouterLink, BadgeComponent, IconComponent, PriceComponent, RatingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <article class="group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card transition-shadow hover:shadow-popover">
      <div class="relative aspect-square overflow-hidden bg-surface-alt">
        <img
          [ngSrc]="product().image.url"
          [width]="product().image.width"
          [height]="product().image.height"
          [alt]="product().image.alt"
          [priority]="priority()"
          class="size-full object-cover"
        />
        @if (product().hoverImage; as hover) {
          <img
            [ngSrc]="hover.url"
            [width]="hover.width"
            [height]="hover.height"
            alt=""
            class="absolute inset-0 hidden size-full object-cover opacity-0 transition-opacity duration-250 group-hover:opacity-100 md:block"
          />
        }
        <div class="absolute left-2 top-2 flex flex-col items-start gap-1">
          @if (percent() > 0) {
            <ui-badge tone="sale">{{ percent() }}% off</ui-badge>
          }
          @if (product().stockStatus === 'out_of_stock') {
            <ui-badge tone="danger">Out of stock</ui-badge>
          } @else if (product().stockStatus === 'low_stock') {
            <ui-badge tone="warning">Only {{ product().stockLeft }} left</ui-badge>
          }
        </div>
        <button
          type="button"
          class="absolute right-2 top-2 z-10 inline-flex size-11 items-center justify-center rounded-full bg-surface/90 shadow-card hover:bg-surface"
          [attr.aria-pressed]="wishlisted()"
          [attr.aria-label]="(wishlisted() ? 'Remove ' : 'Add ') + product().title + (wishlisted() ? ' from wishlist' : ' to wishlist')"
          (click)="wishlistToggle.emit()"
        >
          <ui-icon name="heart" [size]="22" [class.text-sale]="wishlisted()" [attr.data-filled]="wishlisted()" />
        </button>
      </div>

      <div class="flex flex-1 flex-col gap-1 p-3">
        <p class="text-xs font-medium uppercase tracking-wide text-text-muted">{{ product().brandName }}</p>
        <h3 class="line-clamp-2 min-h-10 text-sm font-medium text-text">
          <a [routerLink]="['/p', product().slug]" class="after:absolute after:inset-0 after:content-[''] hover:text-primary">{{ product().title }}</a>
        </h3>
        @if (product().rating.count > 0) {
          <ui-rating [value]="product().rating.average" [count]="product().rating.count" [size]="14" />
        }
        <div class="mt-auto pt-1">
          @if (product().priceMin.amount !== product().priceMax.amount) {
            <span class="mr-1 text-xs text-text-muted">From</span>
          }
          <ui-price [price]="product().priceMin" [mrp]="product().mrpMin" />
        </div>
      </div>

      <div class="relative z-10 flex items-center justify-between gap-2 border-t border-border px-3 py-2">
        <label class="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-text-muted">
          <input type="checkbox" class="size-4 accent-primary" [checked]="comparing()" (change)="compareToggle.emit()" />
          Compare
        </label>
        @if (showQuickAdd() && product().quickAddVariantId) {
          <button type="button" class="min-h-11 rounded-md px-3 text-sm font-semibold text-primary hover:bg-surface-alt" (click)="quickAdd.emit()">Add to cart</button>
        }
      </div>
    </article>
  `,
})
export class ProductCardComponent {
  readonly product = input.required<ProductSummary>();
  readonly wishlisted = input(false);
  readonly comparing = input(false);
  readonly showQuickAdd = input(true);
  /** Mark the first row's images as high priority for LCP. */
  readonly priority = input(false);

  readonly wishlistToggle = output<void>();
  readonly compareToggle = output<void>();
  readonly quickAdd = output<void>();

  protected readonly percent = computed(() => discountPercent(this.product().priceMin, this.product().mrpMin));
}
