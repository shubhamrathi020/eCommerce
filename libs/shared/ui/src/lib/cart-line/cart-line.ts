import { DatePipe, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CartLine } from '@ecom/shared/models';
import { MoneyPipe } from '@ecom/shared/util';
import { PriceComponent } from '../price/price';
import { QuantityStepperComponent } from '../quantity-stepper/quantity-stepper';

/** One cart line: image, title, chosen options, price, quantity controls (optional) and remove. */
@Component({
  selector: 'ui-cart-line',
  imports: [DatePipe, NgOptimizedImage, RouterLink, MoneyPipe, PriceComponent, QuantityStepperComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="flex gap-3">
      <a [routerLink]="['/p', line().slug]" class="shrink-0" tabindex="-1" aria-hidden="true">
        <img [ngSrc]="line().image.url" [width]="line().image.width" [height]="line().image.height" alt="" class="rounded-md object-cover" [class]="compact() ? 'size-16' : 'size-20 md:size-24'" />
      </a>
      <div class="min-w-0 flex-1">
        <p class="text-xs uppercase tracking-wide text-text-muted">{{ line().brandName }}</p>
        <a [routerLink]="['/p', line().slug]" class="line-clamp-2 font-medium hover:text-primary">{{ line().title }}</a>
        @if (optionsText()) {
          <p class="text-sm text-text-muted">{{ optionsText() }}</p>
        }
        @if (line().issue === 'out_of_stock') {
          <p class="mt-1 text-sm font-medium text-danger" role="alert">Out of stock. Remove it to continue.</p>
        } @else {
          @if (line().issue === 'price_changed' && line().previousUnitPrice) {
            <p class="mt-1 text-sm text-warning">Price updated from {{ line().previousUnitPrice | money }}</p>
          } @else if (line().issue === 'quantity_reduced') {
            <p class="mt-1 text-sm text-warning">Quantity reduced to available stock</p>
          }
          @if (line().backorder; as back) {
            <p class="mt-1 text-sm text-warning">On backorder{{ back.expectedDate ? ': ships around ' + (back.expectedDate | date: 'd MMM y') : '' }}</p>
          }
          <div class="mt-1 flex flex-wrap items-center justify-between gap-2">
            <ui-price [price]="line().unitPrice" [mrp]="line().mrp" />
            @if (editable()) {
              <ui-quantity-stepper [value]="line().quantity" [max]="line().maxQuantity" [label]="'Quantity of ' + line().title" (valueChange)="quantityChange.emit($event)" />
            } @else {
              <span class="text-sm text-text-muted">Qty {{ line().quantity }}</span>
            }
          </div>
        }
      </div>
      <div class="flex shrink-0 flex-col items-end justify-between">
        @if (line().issue !== 'out_of_stock') {
          <p class="font-semibold">{{ line().lineTotal | money }}</p>
        }
        @if (editable()) {
          <button type="button" class="min-h-11 text-sm font-medium text-danger hover:underline" (click)="remove.emit()">Remove<span class="sr-only"> {{ line().title }}</span></button>
        }
      </div>
    </div>
  `,
})
export class CartLineComponent {
  readonly line = input.required<CartLine>();
  readonly compact = input(false);
  readonly editable = input(true);

  readonly quantityChange = output<number>();
  readonly remove = output<void>();

  protected readonly optionsText = computed(() => Object.values(this.line().options).join(' · '));
}
