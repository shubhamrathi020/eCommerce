import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Money } from '@ecom/shared/models';
import { MoneyPipe, discountPercent } from '@ecom/shared/util';

/** Selling price with optional struck-through MRP and % off. Always use this for showing prices. */
@Component({
  selector: 'ui-price',
  imports: [MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex flex-wrap items-baseline gap-x-2' },
  template: `
    <span class="text-lg font-semibold text-text">{{ price() | money }}</span>
    @if (percent() > 0) {
      <span class="text-sm text-text-muted line-through"><span class="sr-only">MRP </span>{{ mrp() | money }}</span>
      <span class="text-sm font-semibold text-success">{{ percent() }}% off</span>
    }
  `,
})
export class PriceComponent {
  readonly price = input.required<Money>();
  readonly mrp = input<Money>();
  protected readonly percent = computed(() => discountPercent(this.price(), this.mrp()));
}
