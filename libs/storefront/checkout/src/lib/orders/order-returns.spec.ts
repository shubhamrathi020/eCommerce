import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '@ecom/shared/core';
import { AdminReturnApi, AuthApi, DEMO_ACCOUNTS, MockOrderStore, loadCatalogData, provideAdminDataAccess, provideDataAccess } from '@ecom/shared/data-access';
import type { Order } from '@ecom/shared/models';
import { AuthStore } from '@ecom/shared/state';
import { checkoutRoutes } from '../checkout.routes';

const config = { useMocks: true, mockLatencyMs: 0, apiBaseUrl: '', siteName: 'Shop', siteUrl: 'http://x', features: {} };
const customer = DEMO_ACCOUNTS[0];
const admin = DEMO_ACCOUNTS[1];

async function settle(h: RouterTestingHarness, rounds = 10) {
  for (let i = 0; i < rounds; i++) {
    await h.fixture.whenStable();
    await new Promise((r) => setTimeout(r, 20));
    h.detectChanges();
  }
}

async function orderOf(status: Order['status'], paymentStatus: Order['paymentStatus'], userId: string | undefined): Promise<Order> {
  const { products } = await loadCatalogData();
  const p = products.find((x) => x.variants[0].stock > 10) as (typeof products)[number];
  const v = p.variants[0];
  const at = new Date(Date.now() - 86_400_000).toISOString();
  const money = (amount: number) => ({ amount, currency: 'INR' as const });
  return {
    id: `ORD-${status}-${paymentStatus}`.toUpperCase(),
    status,
    paymentStatus,
    paymentMethod: paymentStatus === 'cod' ? 'cod' : 'razorpay',
    lines: [{ productId: p.id, variantId: v.id, slug: p.slug, title: p.title, brandName: p.brandName, image: p.images[0], options: v.options, unitPrice: v.price, quantity: 1, maxQuantity: 10, lineTotal: v.price, taxIncluded: money(0) }],
    totals: { itemCount: 1, subtotal: v.price, mrpSavings: money(0), couponDiscount: money(0), shipping: money(0), taxIncluded: money(0), total: v.price },
    shippingMethod: 'standard',
    contact: { name: customer.name, email: customer.email, phone: '9876543210' },
    address: { line1: '1 Main St', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
    timeline: [
      { status: 'placed', label: 'Order placed', at },
      ...(status === 'cancelled' ? [{ status: 'cancelled' as const, label: 'Order cancelled', at }] : [{ status: 'confirmed' as const, label: 'Order confirmed', at }]),
    ],
    createdAt: at,
    ...(userId ? { userId } : {}),
  };
}

async function setup() {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideRouter(checkoutRoutes, withComponentInputBinding()), { provide: APP_CONFIG, useValue: config }, provideDataAccess({ useMocks: true }), provideAdminDataAccess({ useMocks: true })],
  });
  const auth = TestBed.inject(AuthStore);
  await auth.init();
  return { harness: await RouterTestingHarness.create(), auth };
}

const links = (root: HTMLElement) => Array.from(root.querySelectorAll('a')).map((a) => a.textContent?.trim());

describe('order page: returns, help and refund status', () => {
  it('offers "Return items" and "Get help" to the customer who placed a delivered order', async () => {
    const { harness, auth } = await setup();
    await auth.login(customer.email, customer.password);
    const order = await orderOf('confirmed', 'cod', customer.id);
    TestBed.inject(MockOrderStore).save(order);
    // Mock orders deliver themselves six minutes after confirmation, so back-date the confirmation.
    TestBed.inject(MockOrderStore).save({ ...order, timeline: order.timeline.map((t) => (t.status === 'confirmed' ? { ...t, at: new Date(Date.now() - 3_600_000).toISOString() } : t)) });
    await harness.navigateByUrl(`/orders/${order.id}`);
    await settle(harness);
    const root = harness.routeNativeElement as HTMLElement;
    expect(root.textContent).toContain('Delivered');
    expect(links(root)).toEqual(expect.arrayContaining(['Return items', 'Get help']));
  });

  it('offers neither to a guest who found the order link', async () => {
    const { harness } = await setup();
    const order = await orderOf('confirmed', 'cod', undefined);
    TestBed.inject(MockOrderStore).save({ ...order, timeline: order.timeline.map((t) => (t.status === 'confirmed' ? { ...t, at: new Date(Date.now() - 3_600_000).toISOString() } : t)) });
    await harness.navigateByUrl(`/orders/${order.id}`);
    await settle(harness);
    const root = harness.routeNativeElement as HTMLElement;
    expect(links(root)).not.toContain('Return items');
    expect(links(root)).not.toContain('Get help');
  });

  it('moves a cancelled prepaid order from "refund in progress" to "refunded" once staff pay it', async () => {
    const { harness, auth } = await setup();
    await auth.login(customer.email, customer.password);
    const order = await orderOf('cancelled', 'refund_pending', customer.id);
    TestBed.inject(MockOrderStore).save(order);
    await harness.navigateByUrl(`/orders/${order.id}`);
    await settle(harness);
    let root = harness.routeNativeElement as HTMLElement;
    expect(root.textContent).toContain('Your refund will be returned to the original payment method.');

    await auth.logout();
    await auth.login(admin.email, admin.password);
    await firstValueFrom(TestBed.inject(AdminReturnApi).refundOrder(order.id));
    await auth.logout();
    await auth.login(customer.email, customer.password);
    await firstValueFrom(TestBed.inject(AuthApi).me());
    await harness.navigateByUrl('/');
    await harness.navigateByUrl(`/orders/${order.id}`);
    await settle(harness);
    root = harness.routeNativeElement as HTMLElement;
    expect(root.textContent).toContain('Refunded to your original payment method on');
  });
});
