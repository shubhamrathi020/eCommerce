import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CompareStore, SeoService } from '@ecom/shared/core';
import { CatalogApi, CategoryApi } from '@ecom/shared/data-access';
import type { CategoryNode, Product } from '@ecom/shared/models';
import { ButtonComponent, EmptyStateComponent, PriceComponent, RatingComponent, SkeletonComponent } from '@ecom/shared/ui';

interface Row {
  label: string;
  values: string[];
  differs: boolean;
}

const flatten = (nodes: CategoryNode[]): CategoryNode[] => nodes.flatMap((n) => [n, ...flatten(n.children)]);

/** Side-by-side comparison of up to four products, highlighting rows where values differ. */
@Component({
  selector: 'app-compare-page',
  imports: [NgOptimizedImage, RouterLink, ButtonComponent, EmptyStateComponent, PriceComponent, RatingComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-4 text-2xl font-bold md:text-3xl">Compare products</h1>
    @if (store.count() === 0) {
      <ui-empty-state title="Nothing to compare yet" description="Tick “Compare” on up to four products to see them side by side.">
        <a uiButton routerLink="/">Continue shopping</a>
      </ui-empty-state>
    } @else if (products().length === 0) {
      <ui-skeleton class="h-64" />
    } @else {
      <div class="overflow-x-auto">
        <table class="w-full min-w-[40rem] border-collapse text-left text-sm">
          <caption class="sr-only">Product comparison</caption>
          <thead>
            <tr>
              <td class="w-32 p-2"></td>
              @for (p of products(); track p.id) {
                <th scope="col" class="w-1/4 p-2 align-top font-normal">
                  <img [ngSrc]="p.images[0].url" [width]="p.images[0].width" [height]="p.images[0].height" [alt]="p.images[0].alt" class="mb-2 aspect-square w-full rounded-md object-cover" />
                  <a [routerLink]="['/p', p.slug]" class="font-medium hover:text-primary hover:underline">{{ p.title }}</a>
                  <button type="button" class="mt-1 block min-h-11 text-sm text-danger hover:underline" (click)="store.remove(p.id)">Remove <span class="sr-only">{{ p.title }}</span></button>
                </th>
              }
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr>
              <th scope="row" class="p-2 font-medium text-text-muted">Price</th>
              @for (p of products(); track p.id) {
                <td class="p-2"><ui-price [price]="minPrice(p)" /></td>
              }
            </tr>
            <tr>
              <th scope="row" class="p-2 font-medium text-text-muted">Rating</th>
              @for (p of products(); track p.id) {
                <td class="p-2">
                  @if (p.rating.count) {
                    <ui-rating [value]="p.rating.average" [count]="p.rating.count" [size]="14" />
                  } @else {
                    <span class="text-text-muted">No reviews</span>
                  }
                </td>
              }
            </tr>
            @for (row of rows(); track row.label) {
              <tr [class.bg-surface-alt]="row.differs">
                <th scope="row" class="p-2 font-medium text-text-muted">{{ row.label }}@if (row.differs) { <span class="sr-only"> (differs)</span> }</th>
                @for (value of row.values; track $index) {
                  <td class="p-2" [class.font-semibold]="row.differs">{{ value }}</td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
      <button uiButton variant="secondary" type="button" class="mt-4" (click)="store.clear()">Clear all</button>
    }
  `,
})
export class ComparePageComponent {
  protected readonly store = inject(CompareStore);
  private readonly api = inject(CatalogApi);
  private readonly categoryApi = inject(CategoryApi);

  private readonly resource = rxResource({ params: () => this.store.ids(), stream: ({ params }) => this.api.productsByIds(params) });
  private readonly categories = rxResource({ stream: () => this.categoryApi.tree() });

  protected readonly products = computed<Product[]>(() => (this.resource.hasValue() && this.store.count() > 0 ? this.resource.value() : []));

  protected readonly rows = computed<Row[]>(() => {
    const products = this.products();
    // Attribute labels and value order come from each product's own category (keys are reused across categories).
    const defsOf = new Map<string, Map<string, { label: string; values?: string[] }>>();
    if (this.categories.hasValue()) {
      for (const cat of flatten(this.categories.value())) defsOf.set(cat.id, new Map((cat.attributeDefs ?? []).map((d) => [d.key, d])));
    }
    const keys = [...new Set(products.flatMap((p) => [...p.variantAxes, ...Object.keys(p.attributes)]))];
    return keys.map((key) => {
      const label = products.map((p) => defsOf.get(p.categoryId)?.get(key)?.label).find(Boolean) ?? key;
      const values = products.map((p) => {
        if (key in p.attributes) return String(p.attributes[key]);
        if (!p.variantAxes.includes(key)) return '-';
        const order = defsOf.get(p.categoryId)?.get(key)?.values ?? [];
        const present = [...new Set(p.variants.map((v) => v.options[key]))];
        return present.sort((x, y) => order.indexOf(x) - order.indexOf(y)).join(', ');
      });
      return { label, values, differs: new Set(values).size > 1 };
    });
  });

  constructor() {
    inject(SeoService).set({ title: 'Compare products', noindex: true, path: '/compare' });
  }

  protected minPrice(p: Product) {
    return p.variants.reduce((a, b) => (b.price.amount < a.price.amount ? b : a)).price;
  }
}
