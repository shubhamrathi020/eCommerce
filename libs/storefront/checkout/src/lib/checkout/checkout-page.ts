import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SeoService, ToastService } from '@ecom/shared/core';
import { AddressBookApi, CheckoutApi, OrderApi, PaymentApi } from '@ecom/shared/data-access';
import type { Order, PaymentMethod, PaymentOption, SavedAddress, ShippingMethodId, ShippingOption } from '@ecom/shared/models';
import { ApiException } from '@ecom/shared/models';
import { AuthStore, CartStore } from '@ecom/shared/state';
import { ButtonComponent, CartLineComponent, FormFieldComponent, InputDirective, OrderSummaryComponent, SkeletonComponent, StepperComponent } from '@ecom/shared/ui';
import { MoneyPipe } from '@ecom/shared/util';
import { MockRazorpayComponent } from '../payment/mock-razorpay';
import { MockPaymentLauncher, PaymentLauncher } from '../payment/payment-launcher';

const STEPS = ['Address', 'Delivery', 'Payment', 'Review'];
const nonEmpty = [Validators.required, Validators.pattern(/\S/)];
type FieldName = 'name' | 'email' | 'phone' | 'line1' | 'line2' | 'city' | 'state' | 'pincode';
const INVALID_MESSAGES: Partial<Record<FieldName, string>> = { email: 'Enter a valid email address', phone: 'Enter a valid 10-digit mobile number', pincode: 'Enter a valid 6-digit pin code' };

/** Four-step guest checkout. Money, stock and coupon rules are always decided by the API. */
@Component({
  selector: 'app-checkout-page',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, MoneyPipe, ButtonComponent, CartLineComponent, FormFieldComponent, InputDirective, OrderSummaryComponent, SkeletonComponent, StepperComponent, MockRazorpayComponent],
  providers: [{ provide: PaymentLauncher, useExisting: MockPaymentLauncher }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-3 text-2xl font-bold md:text-3xl">Checkout</h1>
    <ui-stepper class="mb-6" [steps]="steps" [current]="step()" />

    @if (!store.loaded()) {
      <ui-skeleton class="h-64" />
    } @else if (store.cart(); as cart) {
      <div class="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section aria-live="polite">
          <h2 id="step-heading" tabindex="-1" class="mb-4 text-xl font-semibold outline-none">{{ steps[step()] }}</h2>

          @switch (step()) {
            @case (0) {
              @if (saved().length) {
                <div class="mb-4">
                  <label for="saved-address" class="mb-1 block text-sm font-medium">Deliver to a saved address</label>
                  <select id="saved-address" uiInput (change)="pickSaved($any($event.target).value)">
                    <option value="">Enter a new address</option>
                    @for (a of saved(); track a.id) {
                      <option [value]="a.id" [selected]="a.id === selectedSaved()">{{ a.label }}: {{ a.address.line1 }}, {{ a.address.city }} {{ a.address.pincode }}</option>
                    }
                  </select>
                </div>
              }
              <form [formGroup]="form" (ngSubmit)="continueFromAddress()" novalidate class="grid gap-4 md:grid-cols-2">
                <ui-form-field #f1="uiFormField" label="Full name" [required]="true" [error]="err('name')">
                  <input uiInput [id]="f1.id" formControlName="name" autocomplete="name" [attr.aria-describedby]="f1.describedBy()" [attr.aria-invalid]="err('name') ? 'true' : null" />
                </ui-form-field>
                <ui-form-field #f2="uiFormField" label="Email" [required]="true" [error]="err('email')">
                  <input uiInput type="email" [id]="f2.id" formControlName="email" autocomplete="email" inputmode="email" [attr.aria-describedby]="f2.describedBy()" [attr.aria-invalid]="err('email') ? 'true' : null" />
                </ui-form-field>
                <ui-form-field #f3="uiFormField" label="Mobile number" [required]="true" [error]="err('phone')" hint="10 digits">
                  <input uiInput type="tel" [id]="f3.id" formControlName="phone" autocomplete="tel-national" inputmode="numeric" maxlength="10" [attr.aria-describedby]="f3.describedBy()" [attr.aria-invalid]="err('phone') ? 'true' : null" />
                </ui-form-field>
                <ui-form-field #f4="uiFormField" label="Pin code" [required]="true" [error]="err('pincode')">
                  <input uiInput [id]="f4.id" formControlName="pincode" autocomplete="postal-code" inputmode="numeric" maxlength="6" [attr.aria-describedby]="f4.describedBy()" [attr.aria-invalid]="err('pincode') ? 'true' : null" />
                </ui-form-field>
                <ui-form-field #f5="uiFormField" label="Address line 1" class="md:col-span-2" [required]="true" [error]="err('line1')">
                  <input uiInput [id]="f5.id" formControlName="line1" autocomplete="address-line1" [attr.aria-describedby]="f5.describedBy()" [attr.aria-invalid]="err('line1') ? 'true' : null" />
                </ui-form-field>
                <ui-form-field #f6="uiFormField" label="Address line 2 (optional)" class="md:col-span-2">
                  <input uiInput [id]="f6.id" formControlName="line2" autocomplete="address-line2" />
                </ui-form-field>
                <ui-form-field #f7="uiFormField" label="City" [required]="true" [error]="err('city')">
                  <input uiInput [id]="f7.id" formControlName="city" autocomplete="address-level2" [attr.aria-describedby]="f7.describedBy()" [attr.aria-invalid]="err('city') ? 'true' : null" />
                </ui-form-field>
                <ui-form-field #f8="uiFormField" label="State" [required]="true" [error]="err('state')">
                  <input uiInput [id]="f8.id" formControlName="state" autocomplete="address-level1" [attr.aria-describedby]="f8.describedBy()" [attr.aria-invalid]="err('state') ? 'true' : null" />
                </ui-form-field>
                @if (auth.loggedIn() && !selectedSaved()) {
                  <label class="flex min-h-11 items-center gap-2 text-sm md:col-span-2"><input type="checkbox" class="size-5 accent-primary" [checked]="saveAddress()" (change)="saveAddress.set(!saveAddress())" /> Save this address to my account</label>
                }
                <div class="md:col-span-2">
                  <button uiButton type="submit" [loading]="busy()">Continue to delivery</button>
                </div>
              </form>
            }
            @case (1) {
              <fieldset class="space-y-3">
                <legend class="sr-only">Delivery speed</legend>
                @for (option of shippingOptions(); track option.id) {
                  <label class="flex cursor-pointer items-center gap-3 rounded-lg border p-4" [class]="cart.shippingMethod === option.id ? 'border-primary' : 'border-border'">
                    <input type="radio" name="shipping" class="size-5 accent-primary" [checked]="cart.shippingMethod === option.id" (change)="chooseShipping(option.id)" />
                    <span class="flex-1">
                      <span class="block font-medium">{{ option.label }}</span>
                      <span class="block text-sm text-text-muted">Delivery by {{ option.estimatedDate | date: 'EEE, d MMM' }}</span>
                    </span>
                    <span class="font-semibold">{{ option.price.amount === 0 ? 'Free' : (option.price | money) }}</span>
                  </label>
                }
              </fieldset>
              <div class="mt-4 flex gap-2">
                <button uiButton variant="secondary" type="button" (click)="go(0)">Back</button>
                <button uiButton type="button" [loading]="busy()" (click)="continueFromDelivery()">Continue to payment</button>
              </div>
            }
            @case (2) {
              <fieldset class="space-y-3">
                <legend class="sr-only">Payment method</legend>
                @for (option of paymentOptions(); track option.method) {
                  <label class="flex items-start gap-3 rounded-lg border p-4" [class]="[method() === option.method ? 'border-primary' : 'border-border', option.enabled ? 'cursor-pointer' : 'opacity-60']">
                    <input type="radio" name="payment" class="mt-1 size-5 accent-primary" [checked]="method() === option.method" [disabled]="!option.enabled" [attr.aria-describedby]="option.reason ? 'reason-' + option.method : null" (change)="chooseMethod(option.method)" />
                    <span>
                      <span class="block font-medium">{{ option.label }}</span>
                      @if (option.reason) {
                        <span class="block text-sm text-text-muted" [id]="'reason-' + option.method">{{ option.reason }}</span>
                      }
                    </span>
                  </label>
                }
              </fieldset>
              <div class="mt-4 flex gap-2">
                <button uiButton variant="secondary" type="button" (click)="go(1)">Back</button>
                <button uiButton type="button" (click)="go(3)">Review order</button>
              </div>
            }
            @case (3) {
              <div class="space-y-4">
                <section class="rounded-lg border border-border p-4" aria-label="Delivery address">
                  <p class="flex justify-between font-medium">Deliver to <button type="button" class="min-h-11 text-sm text-primary hover:underline" (click)="go(0)">Change</button></p>
                  <p class="text-sm">{{ form.controls.name.value }}, {{ form.controls.phone.value }}</p>
                  <p class="text-sm text-text-muted">{{ form.controls.line1.value }}, {{ form.controls.line2.value }} {{ form.controls.city.value }}, {{ form.controls.state.value }} {{ form.controls.pincode.value }}</p>
                </section>
                <section class="rounded-lg border border-border p-4" aria-label="Payment">
                  <p class="flex justify-between font-medium">Payment <button type="button" class="min-h-11 text-sm text-primary hover:underline" (click)="go(2)">Change</button></p>
                  <p class="text-sm text-text-muted">{{ method() === 'cod' ? 'Cash on delivery' : 'Pay online with Razorpay (test mode)' }}</p>
                </section>
                <ul class="divide-y divide-border rounded-lg border border-border px-4" aria-label="Items">
                  @for (line of cart.lines; track line.variantId) {
                    <li class="py-3"><ui-cart-line [line]="line" [compact]="true" [editable]="false" /></li>
                  }
                </ul>

                @if (payError()) {
                  <div class="rounded-md border border-danger p-3 text-sm" role="alert">
                    <p>{{ payError() }}</p>
                    @if (pendingOrder(); as order) {
                      <div class="mt-2 flex flex-wrap gap-2">
                        <button uiButton size="sm" type="button" [loading]="busy()" (click)="retryPayment(order.id)">Retry payment</button>
                        <button uiButton size="sm" variant="secondary" type="button" (click)="switchMethod()">Choose another method</button>
                      </div>
                    }
                  </div>
                }
                <div class="flex gap-2">
                  <button uiButton variant="secondary" type="button" (click)="go(2)">Back</button>
                  <button uiButton type="button" [loading]="busy()" [disabled]="!!pendingOrder()" (click)="placeOrder()">
                    @if (method() === 'cod') {
                      Place order
                    } @else {
                      Pay {{ cart.totals.total | money }}
                    }
                  </button>
                </div>
              </div>
            }
          }
        </section>

        <aside class="h-fit rounded-lg border border-border p-4" aria-label="Order summary">
          <h2 class="mb-3 font-semibold">Order summary</h2>
          <ui-order-summary [totals]="cart.totals" [coupon]="cart.coupon" [promotions]="cart.promotions" />
          <a routerLink="/cart" class="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">Edit cart</a>
        </aside>
      </div>
    }
    <app-mock-razorpay />
  `,
})
export class CheckoutPageComponent {
  protected readonly store = inject(CartStore);
  private readonly checkout = inject(CheckoutApi);
  private readonly orders = inject(OrderApi);
  private readonly payments = inject(PaymentApi);
  private readonly launcher = inject(PaymentLauncher);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthStore);
  private readonly book = inject(AddressBookApi);

  protected readonly saved = signal<SavedAddress[]>([]);
  protected readonly selectedSaved = signal('');
  protected readonly saveAddress = signal(true);

  protected readonly steps = STEPS;
  protected readonly step = signal(0);
  protected readonly busy = signal(false);
  protected readonly serverErrors = signal<Record<string, string>>({});
  protected readonly shippingOptions = signal<ShippingOption[]>([]);
  protected readonly paymentOptions = signal<PaymentOption[]>([]);
  protected readonly method = signal<PaymentMethod>('razorpay');
  protected readonly payError = signal('');
  protected readonly pendingOrder = signal<Order | null>(null);
  private idempotencyKey = crypto.randomUUID();

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: nonEmpty }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)] }),
    line1: new FormControl('', { nonNullable: true, validators: nonEmpty }),
    line2: new FormControl('', { nonNullable: true }),
    city: new FormControl('', { nonNullable: true, validators: nonEmpty }),
    state: new FormControl('', { nonNullable: true, validators: nonEmpty }),
    pincode: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^[1-9]\d{5}$/)] }),
  });

  constructor() {
    inject(SeoService).set({ title: 'Checkout', noindex: true, path: '/checkout' });
    void this.prefillFromAccount();
    // Move keyboard focus to the new step's heading so screen-reader users know the page changed.
    effect(() => {
      this.step();
      setTimeout(() => document.getElementById('step-heading')?.focus(), 0);
    });
  }

  /** Signed-in customers get their details and default address filled in. */
  private async prefillFromAccount(): Promise<void> {
    await this.auth.init();
    const user = this.auth.user();
    if (!user) return;
    this.form.patchValue({ name: user.name, email: user.email, phone: user.phone ?? '' });
    try {
      const list = await firstValueFrom(this.book.list());
      this.saved.set(list);
      const fallback = list.find((a) => a.isDefault);
      if (fallback) this.pickSaved(fallback.id);
    } catch {
      // Checkout still works without saved addresses.
    }
  }

  protected pickSaved(id: string): void {
    this.selectedSaved.set(id);
    const a = this.saved().find((x) => x.id === id);
    if (!a) {
      this.form.patchValue({ line1: '', line2: '', city: '', state: '', pincode: '' });
      return;
    }
    this.form.patchValue({ name: a.name, phone: a.phone, line1: a.address.line1, line2: a.address.line2 ?? '', city: a.address.city, state: a.address.state, pincode: a.address.pincode });
  }

  protected err(name: FieldName): string {
    const control = this.form.controls[name];
    const server = this.serverErrors()[name];
    if (server) return server;
    if (!(control.touched && control.invalid)) return '';
    return control.value.trim() ? (INVALID_MESSAGES[name] ?? 'Enter a valid value') : 'This field is required';
  }

  protected go(step: number): void {
    if (step < 3) this.newKey();
    this.payError.set('');
    this.step.set(step);
  }

  protected async continueFromAddress(): Promise<void> {
    this.serverErrors.set({});
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      const first = Object.keys(this.form.controls).find((k) => this.form.get(k)?.invalid);
      if (first) document.querySelector<HTMLElement>(`[formcontrolname="${first}"]`)?.focus();
      return;
    }
    this.busy.set(true);
    try {
      this.shippingOptions.set(await firstValueFrom(this.checkout.shippingOptions(this.form.controls.pincode.value)));
      this.go(1);
    } catch (error) {
      this.serverErrors.set({ pincode: error instanceof ApiException ? error.message : 'Could not check delivery. Please try again.' });
    } finally {
      this.busy.set(false);
    }
  }

  protected async chooseShipping(id: ShippingMethodId): Promise<void> {
    await this.store.setShippingMethod(id);
  }

  protected async continueFromDelivery(): Promise<void> {
    this.busy.set(true);
    try {
      const options = await firstValueFrom(this.checkout.paymentOptions(this.form.controls.pincode.value));
      this.paymentOptions.set(options);
      // Keep the choice valid if COD stopped being available (e.g. total rose after picking express).
      if (!options.find((o) => o.method === this.method())?.enabled) this.method.set('razorpay');
      this.go(2);
    } catch (error) {
      this.toast.error(error instanceof ApiException ? error.message : 'Could not load payment options.');
    } finally {
      this.busy.set(false);
    }
  }

  protected chooseMethod(method: PaymentMethod): void {
    this.method.set(method);
    this.newKey();
  }

  private newKey(): void {
    this.idempotencyKey = crypto.randomUUID();
    this.pendingOrder.set(null);
  }

  protected async placeOrder(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.payError.set('');
    try {
      const f = this.form.getRawValue();
      const order = await firstValueFrom(
        this.orders.place({
          idempotencyKey: this.idempotencyKey,
          contact: { name: f.name.trim(), email: f.email.trim(), phone: f.phone },
          address: { line1: f.line1.trim(), ...(f.line2.trim() ? { line2: f.line2.trim() } : {}), city: f.city.trim(), state: f.state.trim(), pincode: f.pincode },
          paymentMethod: this.method(),
        }),
      );
      // Cash on delivery, or a gift card / store credit that covered the whole order: nothing to pay online.
      if (order.paymentMethod === 'cod' || order.status === 'confirmed') {
        await this.finish(order);
        return;
      }
      this.pendingOrder.set(order);
      await this.pay(order.id);
    } catch (error) {
      if (error instanceof ApiException && error.fields) {
        this.serverErrors.set(error.fields);
        this.step.set(0);
      }
      this.payError.set(error instanceof ApiException ? error.message : 'We could not place your order. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async retryPayment(orderId: string): Promise<void> {
    this.busy.set(true);
    this.payError.set('');
    try {
      await this.pay(orderId);
    } catch (error) {
      this.payError.set(error instanceof ApiException ? error.message : 'Payment could not be completed. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }

  /** Abandons the pending online order so the shopper can pick, for example, cash on delivery. */
  protected switchMethod(): void {
    this.newKey();
    this.payError.set('');
    this.step.set(2);
  }

  private async pay(orderId: string): Promise<void> {
    const session = await firstValueFrom(this.payments.initiate(orderId));
    const outcome = await this.launcher.open(session);
    if (outcome.status === 'success') {
      await this.finish(await firstValueFrom(this.payments.confirm(orderId, outcome.result)));
    } else if (outcome.status === 'failed') {
      await firstValueFrom(this.payments.fail(orderId, outcome.reason));
      this.payError.set('Your payment did not go through. You can retry or choose another payment method.');
    } else {
      this.payError.set('Payment was cancelled. Your order is saved; you can retry when ready.');
    }
  }

  private async finish(order: Order): Promise<void> {
    if (this.auth.loggedIn() && this.saveAddress() && !this.selectedSaved()) {
      const f = this.form.getRawValue();
      try {
        await firstValueFrom(this.book.add({ label: `Address ${this.saved().length + 1}`, name: f.name.trim(), phone: f.phone, address: { line1: f.line1.trim(), ...(f.line2.trim() ? { line2: f.line2.trim() } : {}), city: f.city.trim(), state: f.state.trim(), pincode: f.pincode } }));
      } catch {
        // Saving the address is a convenience; the order already succeeded.
      }
    }
    await this.store.refresh();
    this.toast.success(`Order placed. A confirmation was sent to ${order.contact.email}.`);
    await this.router.navigate(['/orders', order.id], { queryParams: { placed: 1 } });
  }
}
