import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { SeoService } from '@ecom/shared/core';
import { AdminPromotionApi } from '@ecom/shared/data-access';
import { MoneyPipe } from '@ecom/shared/util';
import { EmptyStateComponent, ErrorStateComponent, SkeletonComponent } from '@ecom/shared/ui';

/** Variants whose "was" price would make a misleading discount label (PE-07). The shop hides the label for these. */
@Component({
  selector: 'adm-price-health',
  imports: [RouterLink, MoneyPipe, EmptyStateComponent, ErrorStateComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="mb-4 max-w-2xl text-sm text-text-muted">A struck-through MRP and a “% off” label are shown only when the MRP is a believable earlier price: above the selling price and no more than four times it (75% off). Anything else is listed here and shown to shoppers without a discount label until you correct it.</p>
    @if (resource.hasValue()) {
      @if (resource.value().length === 0) {
        <ui-empty-state title="No misleading discounts" description="Every MRP in the catalog is a believable earlier price." />
      } @else {
        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full min-w-[40rem] text-start text-sm">
            <caption class="sr-only">Variants with a questionable MRP</caption>
            <thead class="bg-surface-alt">
              <tr><th scope="col" class="p-2">Product</th><th scope="col" class="p-2">SKU</th><th scope="col" class="p-2 text-end">Price</th><th scope="col" class="p-2 text-end">MRP</th><th scope="col" class="p-2">Problem</th></tr>
            </thead>
            <tbody class="divide-y divide-border">
              @for (i of resource.value(); track i.variantId) {
                <tr>
                  <td class="p-2"><a [routerLink]="['/products', i.productId]" class="text-primary hover:underline">{{ i.title }}</a></td>
                  <td class="p-2 font-mono text-xs">{{ i.sku }}</td>
                  <td class="p-2 text-end">{{ i.price | money }}</td>
                  <td class="p-2 text-end">{{ i.mrp | money }}</td>
                  <td class="p-2">{{ i.problem }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-32" />
    }
  `,
})
export class PriceHealthPageComponent {
  private readonly api = inject(AdminPromotionApi);
  protected readonly resource = rxResource({ stream: () => this.api.priceHealth() });

  constructor() {
    inject(SeoService).set({ title: 'Price health', noindex: true });
  }
}
