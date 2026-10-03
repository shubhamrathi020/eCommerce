import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { RecommendationApi } from '@ecom/shared/data-access';
import type { RecRow } from '@ecom/shared/models';
import { ProductCardComponent, ScrollerComponent } from '@ecom/shared/ui';
import { ShopperActions } from '../shopper-actions';

/** An explainable recommendation row: the title, how it was chosen, and for each product why it is there (BRD 15). Renders nothing for a missing or thin row. */
@Component({
  selector: 'app-reco-row',
  imports: [ProductCardComponent, ScrollerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (row(); as r) {
      <section [attr.aria-label]="r.title" [attr.data-strategy]="r.strategy">
        <div class="mb-3">
          <h2 class="text-xl font-semibold md:text-2xl">{{ r.title }}</h2>
          @if (r.subtitle) {
            <p class="text-sm text-text-muted">{{ r.subtitle }}</p>
          }
        </div>
        <ui-scroller [label]="r.title">
          @for (item of r.items; track item.product.id) {
            <div role="listitem" class="w-44 shrink-0 snap-start md:w-56">
              <ui-product-card
                class="h-full"
                [product]="item.product"
                [wishlisted]="actions.wishlistIds().includes(item.product.id)"
                [comparing]="actions.compareIds().includes(item.product.id)"
                (wishlistToggle)="actions.toggleWishlist(item.product)"
                (compareToggle)="actions.toggleCompare(item.product)"
                (quickAdd)="actions.quickAdd(item.product)"
              />
              <p class="mt-1 text-xs text-text-muted">{{ item.reason }}</p>
            </div>
          }
        </ui-scroller>
      </section>
    }
  `,
})
export class RecoRowComponent {
  readonly row = input.required<RecRow | null | undefined>();
  protected readonly actions = inject(ShopperActions);
}

/** Home page recommendations. Loaded after the main content (deferred by the page), so they never delay it. */
@Component({
  selector: 'app-home-recos',
  imports: [RouterLink, RecoRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (recs.hasValue()) {
      <div class="space-y-10">
        <app-reco-row [row]="recs.value().personalised" />
        <app-reco-row [row]="recs.value().trending" />
        <app-reco-row [row]="recs.value().bestSellers" />
        @if (recs.value().personalised || recs.value().trending || recs.value().bestSellers) {
          <p class="text-sm text-text-muted">Rows like these use anonymous browsing activity on this device, only if you accepted analytics. <a routerLink="/personalisation" class="text-primary underline">Change your personalisation choices</a>.</p>
        }
      </div>
    }
  `,
})
export class HomeRecosComponent {
  private readonly api = inject(RecommendationApi);
  protected readonly recs = rxResource({ stream: () => this.api.home() });
}

/** Product page recommendations (similar products and frequently bought together). */
@Component({
  selector: 'app-product-recos',
  imports: [RecoRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (recs.hasValue()) {
      <app-reco-row [row]="recs.value().together" />
      <app-reco-row [row]="recs.value().similar" />
    }
  `,
})
export class ProductRecosComponent {
  readonly productId = input.required<string>();
  private readonly api = inject(RecommendationApi);
  protected readonly recs = rxResource({ params: () => this.productId(), stream: ({ params }) => this.api.forProduct(params) });
}
