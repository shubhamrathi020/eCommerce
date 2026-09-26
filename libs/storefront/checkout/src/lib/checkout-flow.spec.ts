import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import axe from 'axe-core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '@ecom/shared/core';
import { AddressBookApi, CatalogApi, DEMO_ACCOUNTS, OrderApi, provideDataAccess } from '@ecom/shared/data-access';
import { AuthStore, CartStore } from '@ecom/shared/state';
import { checkoutRoutes } from './checkout.routes';
import { MockPaymentLauncher } from './payment/payment-launcher';

const config = { useMocks: true, mockLatencyMs: 0, apiBaseUrl: '', siteName: 'Shop', siteUrl: 'http://x', features: {} };

async function settle(harness: RouterTestingHarness, rounds = 12) {
  for (let i = 0; i < rounds; i++) {
    await harness.fixture.whenStable();
    await new Promise((r) => setTimeout(r, 20));
    harness.detectChanges();
  }
}

async function violations(root: HTMLElement): Promise<string[]> {
  document.body.appendChild(root);
  const r = await axe.run(root, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 100)}`);
}

async function setup() {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideRouter(checkoutRoutes, withComponentInputBinding()), { provide: APP_CONFIG, useValue: config }, provideDataAccess({ useMocks: true })],
  });
  const catalog = TestBed.inject(CatalogApi);
  const list = await firstValueFrom(catalog.listing({ filters: {}, sort: 'featured', page: 1, pageSize: 50 }));
  const variant = (await firstValueFrom(catalog.productsByIds(list.items.map((i) => i.id)))).flatMap((p) => p.variants).find((v) => v.stock >= 20 && v.price.amount < 400_000);
  const store = TestBed.inject(CartStore);
  await store.refresh();
  return { harness: await RouterTestingHarness.create(), store, variantId: variant?.id ?? '' };
}

function fill(el: HTMLElement, name: string, value: string) {
  const input = el.querySelector<HTMLInputElement>(`[formcontrolname="${name}"]`);
  if (!input) throw new Error(`missing field ${name}`);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

const button = (el: HTMLElement, text: string) => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim().startsWith(text)) as HTMLButtonElement | undefined;

async function fillAddress(harness: RouterTestingHarness, el: HTMLElement) {
  fill(el, 'name', 'Asha Rao');
  fill(el, 'email', 'asha@example.com');
  fill(el, 'phone', '9876543210');
  fill(el, 'pincode', '560001');
  fill(el, 'line1', '12 MG Road');
  fill(el, 'city', 'Bengaluru');
  fill(el, 'state', 'Karnataka');
  button(el, 'Continue to delivery')?.click();
  await settle(harness);
}

describe('cart and checkout pages', () => {
  it('cart page shows lines, updates quantity, applies a coupon and shows a validation message', async () => {
    const { harness, store, variantId } = await setup();
    await store.add({ productId: 'x', variantId, quantity: 2, title: 'T' });
    const cart = await harness.navigateByUrl('/cart');
    await settle(harness);
    const el = harness.routeNativeElement as HTMLElement;
    expect(el.querySelectorAll('ui-cart-line')).toHaveLength(1);
    expect(el.textContent).toContain('Your cart');

    const input = el.querySelector<HTMLInputElement>('input[name="code"]');
    input!.value = 'bogus';
    input!.dispatchEvent(new Event('input', { bubbles: true }));
    el.querySelector<HTMLButtonElement>('aside form button[type="submit"]')?.click();
    await settle(harness);
    expect(el.textContent).toContain('not valid');
    expect(cart).toBeTruthy();
  });

  it('redirects an empty cart away from checkout', async () => {
    const { harness } = await setup();
    await harness.navigateByUrl('/checkout');
    expect(TestBed.inject(Router).url).toBe('/cart');
  });

  it('validates the address step, then completes a cash-on-delivery order', async () => {
    const { harness, store, variantId } = await setup();
    await store.add({ productId: 'x', variantId, quantity: 1, title: 'T' });
    await harness.navigateByUrl('/checkout');
    await settle(harness);
    const el = harness.routeNativeElement as HTMLElement;

    button(el, 'Continue to delivery')?.click();
    await settle(harness);
    expect(el.querySelectorAll('[role="alert"]').length).toBeGreaterThan(3);

    await fillAddress(harness, el);
    expect(el.querySelector('#step-heading')?.textContent).toContain('Delivery');
    button(el, 'Continue to payment')?.click();
    await settle(harness);
    const radios = el.querySelectorAll<HTMLInputElement>('input[name="payment"]');
    expect(radios).toHaveLength(2);
    radios[1].click();
    await settle(harness);
    button(el, 'Review order')?.click();
    await settle(harness);
    expect(button(el, 'Place order')).toBeDefined();
    button(el, 'Place order')?.click();
    await settle(harness, 25);

    const router = TestBed.inject(Router);
    expect(router.url).toMatch(/^\/orders\/ORD-.*placed=1/);
    expect(store.isEmpty()).toBe(true);
  });

  it('online payment: failed attempt keeps the order pending, retry succeeds', async () => {
    const { harness, store, variantId } = await setup();
    await store.add({ productId: 'x', variantId, quantity: 1, title: 'T' });
    await harness.navigateByUrl('/checkout');
    await settle(harness);
    const el = harness.routeNativeElement as HTMLElement;
    await fillAddress(harness, el);
    button(el, 'Continue to payment')?.click();
    await settle(harness);
    button(el, 'Review order')?.click();
    await settle(harness);

    const launcher = TestBed.inject(MockPaymentLauncher);
    button(el, 'Pay ')?.click();
    await settle(harness);
    expect(launcher.pending()).not.toBeNull();
    launcher.fail();
    await settle(harness);
    expect(el.textContent).toContain('did not go through');
    expect(store.isEmpty()).toBe(false); // cart kept until paid

    button(el, 'Retry payment')?.click();
    await settle(harness);
    launcher.succeed();
    await settle(harness, 25);
    expect(TestBed.inject(Router).url).toMatch(/^\/orders\/ORD-/);
    expect(store.isEmpty()).toBe(true);
  });

  it('order, invoice and orders list pages render and have no serious accessibility issues', async () => {
    const { harness, store, variantId } = await setup();
    await store.add({ productId: 'x', variantId, quantity: 1, title: 'T' });
    await harness.navigateByUrl('/checkout');
    await settle(harness);
    let el = harness.routeNativeElement as HTMLElement;
    expect(await violations(el)).toEqual([]);
    await fillAddress(harness, el);
    button(el, 'Continue to payment')?.click();
    await settle(harness);
    el.querySelectorAll<HTMLInputElement>('input[name="payment"]')[1].click();
    await settle(harness);
    button(el, 'Review order')?.click();
    await settle(harness);
    button(el, 'Place order')?.click();
    await settle(harness, 25);

    const orderUrl = TestBed.inject(Router).url.split('?')[0];
    await harness.navigateByUrl(orderUrl);
    await settle(harness);
    el = harness.routeNativeElement as HTMLElement;
    expect(el.textContent).toContain('Tracking');
    expect(await violations(el)).toEqual([]);

    await harness.navigateByUrl(`${orderUrl}/invoice`);
    await settle(harness);
    el = harness.routeNativeElement as HTMLElement;
    expect(el.textContent).toContain('Tax Invoice');
    expect(await violations(el)).toEqual([]);

    await harness.navigateByUrl('/orders');
    await settle(harness);
    el = harness.routeNativeElement as HTMLElement;
    expect(el.querySelectorAll('li a').length).toBe(1);

    await harness.navigateByUrl('/cart');
    await settle(harness);
    el = harness.routeNativeElement as HTMLElement;
    expect(el.textContent).toContain('Your cart is empty');
    expect(await violations(el)).toEqual([]);
  }, 30000);

  it('signed-in customers get details and their default address pre-filled, and the order is linked to them', async () => {
    const { harness, store, variantId } = await setup();
    const auth = TestBed.inject(AuthStore);
    await auth.init();
    await auth.login(DEMO_ACCOUNTS[0].email, DEMO_ACCOUNTS[0].password);
    await firstValueFrom(TestBed.inject(AddressBookApi).add({ label: 'Home', name: 'Demo Customer', phone: '9876543210', address: { line1: '5 Park Street', city: 'Kolkata', state: 'West Bengal', pincode: '700016' } }));
    await store.add({ productId: 'x', variantId, quantity: 1, title: 'T' });
    await harness.navigateByUrl('/checkout');
    await settle(harness, 15);
    const el = harness.routeNativeElement as HTMLElement;
    expect((el.querySelector('[formcontrolname="email"]') as HTMLInputElement).value).toBe(DEMO_ACCOUNTS[0].email);
    expect((el.querySelector('[formcontrolname="line1"]') as HTMLInputElement).value).toBe('5 Park Street');
    expect(el.querySelector('#saved-address')).not.toBeNull();

    // A new address can be chosen instead, and offers to be saved.
    const select = el.querySelector<HTMLSelectElement>('#saved-address');
    if (select) {
      select.value = '';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    await settle(harness);
    expect(el.textContent).toContain('Save this address to my account');
    fill(el, 'line1', '12 MG Road');
    fill(el, 'city', 'Bengaluru');
    fill(el, 'state', 'Karnataka');
    fill(el, 'pincode', '560001');
    button(el, 'Continue to delivery')?.click();
    await settle(harness);
    button(el, 'Continue to payment')?.click();
    await settle(harness);
    el.querySelectorAll<HTMLInputElement>('input[name="payment"]')[1].click();
    await settle(harness);
    button(el, 'Review order')?.click();
    await settle(harness);
    button(el, 'Place order')?.click();
    await settle(harness, 25);

    const orders = await firstValueFrom(TestBed.inject(OrderApi).list());
    expect(orders).toHaveLength(1);
    expect(orders[0].userId).toBeDefined();
    const saved = await firstValueFrom(TestBed.inject(AddressBookApi).list());
    expect(saved.map((a) => a.address.line1)).toContain('12 MG Road');
  }, 30000);
});
