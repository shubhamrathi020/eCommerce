import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { I18nService, SeoService, TranslatePipe } from '@ecom/shared/core';
import { CartStore } from '@ecom/shared/state';
import { ButtonComponent, CartLineComponent, EmptyStateComponent, FormFieldComponent, InputDirective, OrderSummaryComponent, SkeletonComponent } from '@ecom/shared/ui';
import { MoneyPipe } from '@ecom/shared/util';
import { WalletPanelComponent } from './wallet-panel';

@Component({
  selector: 'app-cart-page',
  imports: [FormsModule, RouterLink, TranslatePipe, WalletPanelComponent, MoneyPipe, ButtonComponent, CartLineComponent, EmptyStateComponent, FormFieldComponent, InputDirective, OrderSummaryComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-4 text-2xl font-bold md:text-3xl">{{ 'cart.title' | t }}</h1>
    @if (!store.loaded()) {
      <ui-skeleton class="h-40" />
    } @else if (store.cart(); as cart) {
      @if (cart.lines.length === 0) {
        <ui-empty-state [title]="'cart.emptyTitle' | t" [description]="'cart.emptyText' | t">
          <a uiButton routerLink="/">{{ 'cart.continue' | t }}</a>
        </ui-empty-state>
      } @else {
        @if (cart.notices.length) {
          <div class="mb-4 rounded-md border border-warning p-3 text-sm" role="status">
            <ul class="list-disc space-y-1 ps-5">
              @for (notice of cart.notices; track notice) {
                <li>{{ notice }}</li>
              }
            </ul>
          </div>
        }
        <div class="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <section [attr.aria-label]="'cart.items' | t">
            <ul class="divide-y divide-border rounded-lg border border-border px-4">
              @for (line of cart.lines; track line.variantId) {
                <li class="py-4">
                  <ui-cart-line [line]="line" (quantityChange)="store.setQuantity(line.variantId, $event)" (remove)="store.remove(line.variantId, line.title)" />
                </li>
              }
            </ul>
            <a routerLink="/" class="mt-4 inline-flex min-h-11 items-center font-medium text-primary hover:underline">{{ 'cart.continue' | t }}</a>
          </section>

          <aside class="space-y-4" [attr.aria-label]="'cart.summary' | t">
            @if (cart.totals.amountToFreeShipping; as gap) {
              <p class="rounded-md bg-surface-alt p-3 text-sm" role="status">{{ 'cart.addForFreeShipping' | t: { amount: (gap | money) } }}</p>
            } @else if (cart.totals.shipping.amount === 0 && cart.totals.itemCount > 0) {
              <p class="rounded-md bg-surface-alt p-3 text-sm text-success" role="status">{{ 'cart.freeShipping' | t }}</p>
            }

            <div class="rounded-lg border border-border p-4">
              @if (cart.coupon; as coupon) {
                <p class="mb-3 flex items-center justify-between text-sm">
                  <span>{{ 'cart.couponApplied' | t: { code: coupon.code } }}</span>
                  <button type="button" class="min-h-11 font-medium text-danger hover:underline" (click)="removeCoupon()">{{ 'common.remove' | t }}</button>
                </p>
              } @else {
                <form class="mb-3 flex items-end gap-2" (submit)="apply($event)" novalidate>
                  <ui-form-field #f="uiFormField" [label]="'cart.couponLabel' | t" class="flex-1" [error]="couponError()" [hint]="'cart.couponHint' | t">
                    <input uiInput [id]="f.id" [attr.aria-describedby]="f.describedBy()" [attr.aria-invalid]="couponError() ? 'true' : null" autocomplete="off" [(ngModel)]="code" name="code" />
                  </ui-form-field>
                  <button uiButton variant="secondary" type="submit" [loading]="store.busy()">{{ 'cart.apply' | t }}</button>
                </form>
              }
              <app-wallet-panel />
              <ui-order-summary [totals]="cart.totals" [coupon]="cart.coupon" [promotions]="cart.promotions" />
              <a uiButton class="mt-4 w-full" routerLink="/checkout" [attr.aria-disabled]="cart.blocked ? 'true' : null" (click)="guard($event, cart.blocked)">{{ 'cart.checkout' | t }}</a>
              @if (cart.blocked) {
                <p class="mt-2 text-sm text-danger" role="alert">{{ 'cart.blocked' | t }}</p>
              }
            </div>
          </aside>
        </div>
      }
    }
  `,
})
export class CartPageComponent {
  private readonly i18n = inject(I18nService);
  protected readonly store = inject(CartStore);
  protected code = '';
  protected readonly couponError = signal('');
  protected readonly hasItems = computed(() => !this.store.isEmpty());

  constructor() {
    inject(SeoService).set({ title: 'Your cart', noindex: true, path: '/cart' });
    void this.store.refresh();
  }

  protected async apply(event: Event): Promise<void> {
    event.preventDefault();
    this.couponError.set('');
    if (!this.code.trim()) {
      this.couponError.set(this.i18n.t('cart.couponEnter'));
      return;
    }
    const result = await this.store.applyCoupon(this.code);
    if (result.ok) this.code = '';
    else this.couponError.set(result.message ?? this.i18n.t('cart.couponFailed'));
  }

  protected async removeCoupon(): Promise<void> {
    await this.store.removeCoupon();
  }

  protected guard(event: Event, blocked: boolean): void {
    if (blocked) event.preventDefault();
  }
}
