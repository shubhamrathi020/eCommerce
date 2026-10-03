import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartStore } from '@ecom/shared/state';
import { ButtonComponent, CartLineComponent, DrawerComponent, OrderSummaryComponent } from '@ecom/shared/ui';

/** Slide-in cart shown after "Add to cart". */
@Component({
  selector: 'app-mini-cart',
  imports: [RouterLink, ButtonComponent, CartLineComponent, DrawerComponent, OrderSummaryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-drawer [(open)]="store.miniCartOpen" label="Your cart" side="right">
      @if (store.cart(); as cart) {
        @if (cart.lines.length === 0) {
          <p class="text-text-muted">Your cart is empty.</p>
        } @else {
          <ul class="divide-y divide-border">
            @for (line of cart.lines; track line.variantId) {
              <li class="py-3">
                <ui-cart-line [line]="line" [compact]="true" (quantityChange)="store.setQuantity(line.variantId, $event)" (remove)="store.remove(line.variantId, line.title)" />
              </li>
            }
          </ul>
          <ui-order-summary class="mt-4" [totals]="cart.totals" [coupon]="cart.coupon" [promotions]="cart.promotions" />
          <div class="mt-4 grid gap-2">
            <a uiButton routerLink="/checkout" (click)="store.miniCartOpen.set(false)">Checkout</a>
            <a uiButton variant="secondary" routerLink="/cart" (click)="store.miniCartOpen.set(false)">View cart</a>
          </div>
        }
      }
    </ui-drawer>
  `,
})
export class MiniCartComponent {
  protected readonly store = inject(CartStore);
}
