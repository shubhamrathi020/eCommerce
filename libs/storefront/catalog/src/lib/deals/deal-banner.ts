import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { PromotionApi } from '@ecom/shared/data-access';
import { CountdownComponent } from '@ecom/shared/ui';
import { MoneyPipe } from '@ecom/shared/util';

/** A live flash deal on a product page: countdown, price and how many are left (PE-02). The cart applies the price. */
@Component({
  selector: 'app-deal-banner',
  imports: [CountdownComponent, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (deal.hasValue() && deal.value(); as d) {
      <section class="rounded-lg border border-sale p-3 text-sm" aria-label="Flash deal">
        <p class="font-semibold">{{ d.name }}</p>
        <p>
          <strong class="text-base">{{ d.dealPrice | money }}</strong>
          <span class="ml-1 text-text-muted line-through"><span class="sr-only">Regular price </span>{{ d.regularPrice | money }}</span>
          <span class="ml-1 text-text-muted">in your cart, up to {{ d.cap }} units</span>
        </p>
        <p class="mt-1">Ends in <ui-countdown [endsAt]="d.endsAt" /> · <strong>{{ d.remaining }}</strong> of {{ d.cap }} left</p>
      </section>
    }
  `,
})
export class DealBannerComponent {
  readonly productId = input.required<string>();
  private readonly api = inject(PromotionApi);
  protected readonly deal = rxResource({ params: () => this.productId(), stream: ({ params }) => this.api.dealFor(params) });
}

/** Live flash deals on the home page. Hidden when there are none. */
@Component({
  selector: 'app-deals-strip',
  imports: [NgOptimizedImage, RouterLink, CountdownComponent, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (deals.hasValue() && deals.value().length > 0) {
      <section aria-labelledby="deals-h" class="rounded-lg border border-sale p-4 md:p-6">
        <h2 id="deals-h" class="mb-3 text-xl font-bold">Flash deals</h2>
        <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          @for (d of deals.value(); track d.id) {
            <li class="flex gap-3 rounded-md border border-border p-3">
              <img [ngSrc]="d.image.url" width="72" height="72" alt="" class="size-[4.5rem] shrink-0 rounded-md object-cover" />
              <span class="min-w-0 text-sm">
                <a [routerLink]="['/p', d.slug]" class="block truncate font-medium hover:text-primary">{{ d.title }}</a>
                <span class="block"><strong>{{ d.dealPrice | money }}</strong> <span class="text-text-muted line-through"><span class="sr-only">Regular price </span>{{ d.regularPrice | money }}</span></span>
                <span class="block text-text-muted">Ends in <ui-countdown [endsAt]="d.endsAt" /> · {{ d.remaining }} left</span>
              </span>
            </li>
          }
        </ul>
      </section>
    }
  `,
})
export class DealsStripComponent {
  private readonly api = inject(PromotionApi);
  protected readonly deals = rxResource({ stream: () => this.api.activeDeals() });
}
