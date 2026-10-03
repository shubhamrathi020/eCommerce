import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import axe from 'axe-core';
import { APP_CONFIG } from '@ecom/shared/core';
import { DEMO_ACCOUNTS, MockOrderStore, loadCatalogData, provideDataAccess } from '@ecom/shared/data-access';
import type { Order } from '@ecom/shared/models';
import { AuthStore } from '@ecom/shared/state';
import { accountRoutes } from '../account.routes';

const config = { useMocks: true, mockLatencyMs: 0, apiBaseUrl: '', siteName: 'Shop', siteUrl: 'http://x', features: {} };
const demo = DEMO_ACCOUNTS[0];
const DAY = 86_400_000;

async function settle(h: RouterTestingHarness, rounds = 10) {
  for (let i = 0; i < rounds; i++) {
    await h.fixture.whenStable();
    await new Promise((r) => setTimeout(r, 20));
    h.detectChanges();
  }
}

async function violations(root: HTMLElement): Promise<string[]> {
  document.body.appendChild(root);
  const r = await axe.run(root, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 110)}`);
}

const el = (h: RouterTestingHarness) => h.routeNativeElement as HTMLElement;
const button = (root: HTMLElement, text: string) => Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.trim().startsWith(text)) as HTMLButtonElement | undefined;
function fill(root: HTMLElement, selector: string, value: string) {
  const input = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (!input) throw new Error(`missing ${selector}`);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
function choose(root: HTMLElement, selector: string, value: string) {
  const select = root.querySelector<HTMLSelectElement>(selector);
  if (!select) throw new Error(`missing ${selector}`);
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

/** A delivered cash-on-delivery order owned by the demo customer. */
async function deliveredOrder(deliveredDaysAgo = 1): Promise<Order> {
  const { products } = await loadCatalogData();
  const p = products.find((x) => x.variants[0].stock > 10) as (typeof products)[number];
  const v = p.variants[0];
  const confirmedAt = new Date(Date.now() - deliveredDaysAgo * DAY - 6 * 60_000).toISOString();
  const money = (amount: number) => ({ amount, currency: 'INR' as const });
  const order: Order = {
    id: `ORD-UI${deliveredDaysAgo}`,
    status: 'delivered',
    paymentStatus: 'cod',
    paymentMethod: 'cod',
    lines: [{ productId: p.id, variantId: v.id, slug: p.slug, title: p.title, brandName: p.brandName, image: p.images[0], options: v.options, unitPrice: v.price, quantity: 2, maxQuantity: 10, lineTotal: money(v.price.amount * 2), taxIncluded: money(0) }],
    totals: { itemCount: 2, subtotal: money(v.price.amount * 2), mrpSavings: money(0), couponDiscount: money(0), shipping: money(0), taxIncluded: money(0), total: money(v.price.amount * 2) },
    shippingMethod: 'standard',
    contact: { name: demo.name, email: demo.email, phone: '9876543210' },
    address: { line1: '1 Main St', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
    timeline: [
      { status: 'placed', label: 'Order placed', at: confirmedAt },
      { status: 'confirmed', label: 'Order confirmed', at: confirmedAt },
    ],
    createdAt: confirmedAt,
    userId: demo.id,
  };
  TestBed.inject(MockOrderStore).save(order);
  return order;
}

async function setup() {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideRouter([...accountRoutes, { path: '**', children: [] }], withComponentInputBinding()), { provide: APP_CONFIG, useValue: config }, provideDataAccess({ useMocks: true })],
  });
  const auth = TestBed.inject(AuthStore);
  await auth.init();
  await auth.login(demo.email, demo.password);
  return { harness: await RouterTestingHarness.create(), router: TestBed.inject(Router) };
}

describe('returns and support pages', () => {
  it('requires sign in', async () => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([...accountRoutes, { path: '**', children: [] }], withComponentInputBinding()), { provide: APP_CONFIG, useValue: config }, provideDataAccess({ useMocks: true })] });
    await TestBed.inject(AuthStore).init();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/account/returns');
    expect(TestBed.inject(Router).url).toContain('/account/login');
    await harness.navigateByUrl('/account/support');
    expect(TestBed.inject(Router).url).toContain('/account/login');
  });

  it('lets a customer request a return, seeing the refund first, and follow it', async () => {
    const { harness, router } = await setup();
    const order = await deliveredOrder();
    await harness.navigateByUrl(`/account/returns/new?order=${order.id}`);
    await settle(harness);
    let root = el(harness);
    expect(root.textContent).toContain('Return items');
    expect(await violations(root)).toEqual([]);

    // Nothing chosen yet: the form says so instead of submitting.
    button(root, 'Request return')?.click();
    await settle(harness);
    expect(root.querySelectorAll('[role="alert"]').length).toBeGreaterThan(0);

    const quantity = root.querySelector<HTMLSelectElement>('ul select') as HTMLSelectElement;
    expect(Array.from(quantity.options).map((o) => o.value)).toEqual(['0', '1', '2']);
    choose(root, 'ul select', '2');
    const reasons = Array.from(root.querySelectorAll<HTMLSelectElement>('select')).find((s) => s.id.startsWith('ui-field')) as HTMLSelectElement;
    choose(root, `#${reasons.id}`, 'changed_mind');
    await settle(harness);
    expect(root.textContent).toContain('Return shipping fee');
    expect(root.textContent).toContain('store credit');
    expect(await violations(root)).toEqual([]);

    button(root, 'Request return')?.click();
    await settle(harness, 20);
    expect(router.url).toMatch(/^\/account\/returns\/RET-/);
    root = el(harness);
    expect(root.textContent).toContain('Return requested');
    expect(root.textContent).toContain('Withdraw request');
    expect(await violations(root)).toEqual([]);

    await harness.navigateByUrl('/account/returns');
    await settle(harness);
    root = el(harness);
    expect(root.textContent).toContain(order.id);
    expect(root.textContent).toContain('Requested');
    expect(await violations(root)).toEqual([]);

    // The same items can't be requested again while that request is open.
    await harness.navigateByUrl(`/account/returns/new?order=${order.id}`);
    await settle(harness);
    expect(el(harness).textContent).toContain("can't be returned right now");
  });

  it('explains why an order outside the window cannot be returned', async () => {
    const { harness } = await setup();
    const old = await deliveredOrder(12);
    await harness.navigateByUrl(`/account/returns/new?order=${old.id}`);
    await settle(harness);
    expect(el(harness).textContent).toContain('7-day return window ended');
    expect(await violations(el(harness))).toEqual([]);
  });

  it("shows 'not found' for an order that isn't theirs", async () => {
    const { harness } = await setup();
    await harness.navigateByUrl('/account/returns/new?order=ORD-NOPE');
    await settle(harness);
    expect(el(harness).textContent).toContain('could not find');
  });

  it('rejects an unsupported attachment type on the spot', async () => {
    const { harness } = await setup();
    const order = await deliveredOrder();
    await harness.navigateByUrl(`/account/returns/new?order=${order.id}`);
    await settle(harness);
    const root = el(harness);
    const input = root.querySelector<HTMLInputElement>('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'virus.exe', { type: 'application/x-msdownload' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(harness, 3);
    expect(root.textContent).toContain('only JPEG, PNG, WebP or PDF');
  });

  it('asks a support question, lists it, and replies on the ticket', async () => {
    const { harness, router } = await setup();
    const order = await deliveredOrder();
    await harness.navigateByUrl(`/account/support/new?order=${order.id}`);
    await settle(harness);
    let root = el(harness);
    expect(root.querySelector<HTMLSelectElement>('select')?.value).toBe(order.id);
    expect(await violations(root)).toEqual([]);

    button(root, 'Send')?.click();
    await settle(harness);
    expect(root.textContent).toContain('Add a short subject');
    fill(root, 'input:not([type="file"])', 'Box was damaged');
    fill(root, 'textarea', 'The outer box was crushed.');
    button(root, 'Send')?.click();
    await settle(harness, 20);
    expect(router.url).toMatch(/^\/account\/support\/TKT-/);
    root = el(harness);
    expect(root.textContent).toContain('Box was damaged');
    expect(root.textContent).toContain('The outer box was crushed.');
    expect(await violations(root)).toEqual([]);

    fill(root, 'textarea', 'Any update?');
    button(root, 'Send reply')?.click();
    await settle(harness, 20);
    expect(el(harness).textContent).toContain('Any update?');

    await harness.navigateByUrl('/account/support');
    await settle(harness);
    root = el(harness);
    expect(root.textContent).toContain('Box was damaged');
    expect(await violations(root)).toEqual([]);
  });
});
