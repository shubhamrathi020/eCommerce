import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RecentlyViewedStore } from '@ecom/shared/core';
import { CatalogApi } from '@ecom/shared/data-access';
import { ProductRowComponent } from '../product-row/product-row';

/** Strip of the shopper's recently viewed products, optionally excluding the current one. */
@Component({
  selector: 'app-recently-viewed',
  imports: [ProductRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `<app-product-row title="Recently viewed" [items]="items()" />`,
})
export class RecentlyViewedComponent {
  readonly excludeId = input<string>();
  private readonly store = inject(RecentlyViewedStore);
  private readonly api = inject(CatalogApi);

  private readonly ids = computed(() => this.store.ids().filter((id) => id !== this.excludeId()));
  private readonly resource = rxResource({ params: () => this.ids(), stream: ({ params }) => this.api.summariesByIds(params) });

  protected readonly items = computed(() => (this.resource.hasValue() ? this.resource.value() : []));
}
