import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ProductSummary } from '@ecom/contracts';
import { ProductCardComponent, ScrollerComponent } from '@ecom/shared/ui';
import { ShopperActions } from '../shopper-actions';

/** Titled, horizontally scrolling row of product cards. Renders nothing when empty. */
@Component({
  selector: 'app-product-row',
  imports: [RouterLink, ProductCardComponent, ScrollerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (items().length) {
      <section [attr.aria-label]="title()">
        <div class="mb-3 flex items-baseline justify-between">
          <h2 class="text-xl font-semibold md:text-2xl">{{ title() }}</h2>
          @if (link()) {
            <a [routerLink]="link()" class="text-sm font-medium text-primary hover:underline">View all</a>
          }
        </div>
        <ui-scroller [label]="title()">
          @for (product of items(); track product.id) {
            <div role="listitem" class="w-44 shrink-0 snap-start md:w-56">
              <ui-product-card
                class="h-full"
                [product]="product"
                [wishlisted]="actions.wishlistIds().includes(product.id)"
                [comparing]="actions.compareIds().includes(product.id)"
                (wishlistToggle)="actions.toggleWishlist(product)"
                (compareToggle)="actions.toggleCompare(product)"
                (quickAdd)="actions.quickAdd(product)"
              />
            </div>
          }
        </ui-scroller>
      </section>
    }
  `,
})
export class ProductRowComponent {
  readonly title = input.required<string>();
  readonly items = input.required<ProductSummary[]>();
  readonly link = input<string>();
  protected readonly actions = inject(ShopperActions);
}
