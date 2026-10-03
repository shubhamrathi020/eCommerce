import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Facet } from '@ecom/contracts';
import { ButtonComponent, CheckboxComponent, InputDirective } from '@ecom/shared/ui';

export interface PriceRange {
  /** Rupees; undefined means open-ended. */
  min?: number;
  max?: number;
}

const COLLAPSED_COUNT = 6;

const toRupeeText = (paise: number | undefined): string => (paise === undefined ? '' : String(Math.round(paise / 100)));

/** Facet checkboxes plus a price range. Emits changes; the page owns the URL state. */
@Component({
  selector: 'app-filter-panel',
  imports: [FormsModule, ButtonComponent, CheckboxComponent, InputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <form class="space-y-5" aria-label="Filters" (submit)="applyPrice($event)">
      <fieldset class="border-b border-border pb-4">
        <legend class="mb-2 font-semibold">Price (₹)</legend>
        <div class="flex items-center gap-2">
          <label class="sr-only" for="price-min">Minimum price</label>
          <input id="price-min" uiInput type="number" inputmode="numeric" min="0" placeholder="Min" [(ngModel)]="minText" name="min" />
          <span aria-hidden="true">–</span>
          <label class="sr-only" for="price-max">Maximum price</label>
          <input id="price-max" uiInput type="number" inputmode="numeric" min="0" placeholder="Max" [(ngModel)]="maxText" name="max" />
        </div>
        <p class="mt-1 text-xs text-text-muted">Available: ₹{{ boundsMin() }} to ₹{{ boundsMax() }}</p>
        <button uiButton size="sm" variant="secondary" type="submit" class="mt-2">Apply</button>
      </fieldset>

      @for (facet of facets(); track facet.key) {
        <fieldset class="border-b border-border pb-3">
          <legend class="mb-1 font-semibold">{{ facet.label }}</legend>
          @for (option of visible(facet); track option.value) {
            <ui-checkbox [checked]="option.selected" [count]="option.count" (checkedChange)="optionToggle.emit({ key: facet.key, value: option.value })">{{ option.label }}</ui-checkbox>
          }
          @if (facet.options.length > COLLAPSED) {
            <button type="button" class="min-h-11 text-sm font-medium text-primary hover:underline" [attr.aria-expanded]="expanded().has(facet.key)" (click)="toggleExpanded(facet.key)">
              {{ expanded().has(facet.key) ? 'Show less' : 'Show all ' + facet.options.length }}
            </button>
          }
        </fieldset>
      }
    </form>
  `,
})
export class FilterPanelComponent {
  readonly facets = input.required<Facet[]>();
  /** Bounds in paise. */
  readonly priceBounds = input.required<{ min: number; max: number }>();
  /** Current price selection in paise. */
  readonly priceMin = input<number>();
  readonly priceMax = input<number>();

  readonly optionToggle = output<{ key: string; value: string }>();
  readonly price = output<PriceRange>();

  protected readonly COLLAPSED = COLLAPSED_COUNT;
  protected readonly expanded = signal(new Set<string>());
  protected readonly boundsMin = computed(() => Math.floor(this.priceBounds().min / 100).toLocaleString('en-IN'));
  protected readonly boundsMax = computed(() => Math.ceil(this.priceBounds().max / 100).toLocaleString('en-IN'));

  // Text boxes follow the applied price, but stay editable until applied.
  protected readonly minText = linkedSignal(() => toRupeeText(this.priceMin()));
  protected readonly maxText = linkedSignal(() => toRupeeText(this.priceMax()));

  protected visible(facet: Facet) {
    return this.expanded().has(facet.key) ? facet.options : facet.options.slice(0, COLLAPSED_COUNT);
  }

  protected toggleExpanded(key: string): void {
    this.expanded.update((set) => {
      const next = new Set(set);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  protected applyPrice(event: Event): void {
    event.preventDefault();
    const parse = (text: string | number | null): number | undefined => {
      const v = Number.parseInt(String(text ?? ''), 10);
      return Number.isFinite(v) && v >= 0 ? v : undefined;
    };
    this.price.emit({ min: parse(this.minText()), max: parse(this.maxText()) });
  }
}
