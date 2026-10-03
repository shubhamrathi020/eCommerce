import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { SellerPublicApi } from '@ecom/shared/data-access';
import { RatingComponent } from '@ecom/shared/ui';
import { LocaleDatePipe } from '@ecom/shared/core';

/** Who sells this product, how shoppers rate that seller, and the seller's own returns and shipping policy (MP-05). Hidden for the store's own products. */
@Component({
  selector: 'app-seller-card',
  imports: [LocaleDatePipe, RatingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (seller.hasValue() && seller.value(); as s) {
      <section aria-label="Seller" class="rounded-lg border border-border p-3 text-sm">
        <h2 class="mb-1 font-semibold">Sold by {{ s.displayName }}</h2>
        @if (s.rating.count > 0) {
          <p class="flex items-center gap-2"><ui-rating [value]="s.rating.average" [count]="s.rating.count" [size]="16" /> <span class="text-text-muted">seller rating from {{ s.rating.count }} reviews</span></p>
        } @else {
          <p class="text-text-muted">New seller: no reviews yet.</p>
        }
        <p class="mt-1 text-text-muted">On the marketplace since {{ s.since | date: 'MMM y' }}</p>
        <dl class="mt-2 space-y-1">
          <div><dt class="inline font-medium">Returns: </dt><dd class="inline text-text-muted">{{ s.policies.returns }}</dd></div>
          <div><dt class="inline font-medium">Shipping: </dt><dd class="inline text-text-muted">{{ s.policies.shipping }}</dd></div>
        </dl>
      </section>
    }
  `,
})
export class SellerCardComponent {
  readonly sellerId = input<string | undefined>();
  private readonly api = inject(SellerPublicApi);
  protected readonly seller = rxResource({ params: () => this.sellerId(), stream: ({ params }) => this.api.profile(params) });
}
