import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import axe from 'axe-core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '@ecom/shared/core';
import { AuthApi, DEMO_ACCOUNTS, MockInventoryStore, MockOrderStore, ReturnApi, SupportApi, loadCatalogData, provideAdminDataAccess, provideDataAccess } from '@ecom/shared/data-access';
import type { Order } from '@ecom/shared/models';
import { AuthStore } from '@ecom/shared/state';
import { adminRoutes } from '../admin.routes';

const config = { useMocks: true, mockLatencyMs: 0, apiBaseUrl: '', siteName: 'Shop Admin', siteUrl: 'http://x', features: {} };
const admin = DEMO_ACCOUNTS[1];
const customer = DEMO_ACCOUNTS[0];
const DAY = 86_400_000;

async function settle(h: RouterTestingHarness, rounds = 12) {
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

async function setup() {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideRouter(adminRoutes, withComponentInputBinding()), { provide: APP_CONFIG, useValue: config }, provideDataAccess({ useMocks: true }), provideAdminDataAccess({ useMocks: true })],
  });
  const auth = TestBed.inject(AuthStore);
  await auth.init();
  return { harness: await RouterTestingHarness.create(), auth, router: TestBed.inject(Router) };
}

/** Saves a delivered order for the demo customer and has them request a return for 1 unit; returns the ids. */
async function customerRequestsReturn() {
  const authApi = TestBed.inject(AuthApi);
  await firstValueFrom(authApi.login(customer.email, customer.password));
  const { products } = await loadCatalogData();
  const p = products.find((x) => x.variants[0].stock > 10) as (typeof products)[number];
  const v = p.variants[0];
  const confirmedAt = new Date(Date.now() - DAY - 6 * 60_000).toISOString();
  const money = (amount: number) => ({ amount, currency: 'INR' as const });
  const order: Order = {
    id: 'ORD-ADMIN1',
    status: 'delivered',
    paymentStatus: 'cod',
    paymentMethod: 'cod',
    lines: [{ productId: p.id, variantId: v.id, slug: p.slug, title: p.title, brandName: p.brandName, image: p.images[0], options: v.options, unitPrice: v.price, quantity: 1, maxQuantity: 10, lineTotal: v.price, taxIncluded: money(0) }],
    totals: { itemCount: 1, subtotal: v.price, mrpSavings: money(0), couponDiscount: money(0), shipping: money(0), taxIncluded: money(0), total: v.price },
    shippingMethod: 'standard',
    contact: { name: customer.name, email: customer.email, phone: '9876543210' },
    address: { line1: '1 Main St', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
    timeline: [
      { status: 'placed', label: 'Order placed', at: confirmedAt },
      { status: 'confirmed', label: 'Order confirmed', at: confirmedAt },
    ],
    createdAt: confirmedAt,
    userId: customer.id,
  };
  TestBed.inject(MockOrderStore).save(order);
  const ret = await firstValueFrom(TestBed.inject(ReturnApi).create({ orderId: order.id, items: [{ variantId: v.id, quantity: 1 }], reason: 'defective', comments: 'Does not switch on', attachments: [] }));
  await firstValueFrom(authApi.logout());
  return { order, ret, variantId: v.id, title: p.title };
}

describe('admin returns and support', () => {
  it('keeps staff pages away from customers and shows them to staff with their own nav entries', async () => {
    const out = await setup();
    await out.auth.login(customer.email, customer.password);
    await out.harness.navigateByUrl('/returns');
    expect(out.router.url).toContain('/login');
    await out.auth.logout();
    await out.auth.login(admin.email, admin.password);
    await out.harness.navigateByUrl('/returns');
    await settle(out.harness);
    expect(out.router.url).toBe('/returns/queue');
    expect(el(out.harness).textContent).toContain('Returns and refunds');
    expect(await violations(el(out.harness))).toEqual([]);
  });

  it('takes a return from requested to refunded, restocking the item', async () => {
    const out = await setup();
    const { ret, variantId } = await customerRequestsReturn();
    await out.auth.login(admin.email, admin.password);
    const onHand = () =>
      TestBed.inject(MockInventoryStore)
        .movements()
        .filter((m) => m.variantId === variantId && m.kind === 'return').length;

    await out.harness.navigateByUrl('/returns/queue');
    await settle(out.harness);
    let root = el(out.harness);
    expect(root.textContent).toContain(ret.id);
    expect(root.textContent).toContain('Requested');
    expect(await violations(root)).toEqual([]);

    await out.harness.navigateByUrl(`/returns/queue/${ret.id}`);
    await settle(out.harness);
    root = el(out.harness);
    expect(root.textContent).toContain('Refund (computed)');
    expect(root.textContent).toContain('Does not switch on');
    expect(await violations(root)).toEqual([]);

    // A missing pickup date is refused beside the field.
    fill(root, 'input[type="date"]', '');
    button(root, 'Approve and schedule pickup')?.click();
    await settle(out.harness);
    expect(root.textContent).toContain('Choose a pickup date');

    const tomorrow = new Date(Date.now() + DAY).toISOString().slice(0, 10);
    fill(root, 'input[type="date"]', tomorrow);
    button(root, 'Approve and schedule pickup')?.click();
    await settle(out.harness, 15);
    root = el(out.harness);
    expect(root.textContent).toContain('Approved');
    button(root, 'Mark as picked up')?.click();
    await settle(out.harness, 15);

    root = el(out.harness);
    expect(await violations(root)).toEqual([]);
    // Passing the check needs a decision for each item and a note.
    button(root, 'Passed: record check')?.click();
    await settle(out.harness);
    expect(root.textContent).toContain('Describe what you found');
    fill(root, 'textarea', 'Tested, works');
    button(root, 'Passed: record check')?.click();
    await settle(out.harness);
    expect(root.textContent).toContain('Decide for');
    expect(onHand()).toBe(0); // a refused check changes nothing
    choose(root, 'fieldset select', 'restock');
    button(root, 'Passed: record check')?.click();
    await settle(out.harness, 15);
    expect(onHand()).toBe(1);

    root = el(out.harness);
    button(root, 'Issue refund')?.click();
    await settle(out.harness, 15);
    root = el(out.harness);
    expect(root.textContent).toContain('Refunded');
    expect(await violations(root)).toEqual([]);

    await firstValueFrom(TestBed.inject(AuthApi).logout());
    await firstValueFrom(TestBed.inject(AuthApi).login(customer.email, customer.password));
    expect((await firstValueFrom(TestBed.inject(ReturnApi).get(ret.id))).status).toBe('refunded');
  });

  it('rejects a request with a reason', async () => {
    const out = await setup();
    const { ret } = await customerRequestsReturn();
    await out.auth.login(admin.email, admin.password);
    await out.harness.navigateByUrl(`/returns/queue/${ret.id}`);
    await settle(out.harness);
    const root = el(out.harness);
    button(root, 'Reject request')?.click();
    await settle(out.harness);
    expect(root.textContent).toContain('Give a reason');
    fill(root, 'textarea', 'Outside our policy for this item');
    button(root, 'Reject request')?.click();
    await settle(out.harness, 15);
    expect(el(out.harness).textContent).toContain('Rejected: Outside our policy for this item');
  });

  it('saves the return policy and shows validation', async () => {
    const out = await setup();
    await out.auth.login(admin.email, admin.password);
    await out.harness.navigateByUrl('/returns/policy');
    await settle(out.harness);
    let root = el(out.harness);
    expect(await violations(root)).toEqual([]);
    fill(root, 'input[type="number"]', '200');
    button(root, 'Save policy')?.click();
    await settle(out.harness);
    expect(root.textContent).toContain('0 to 90');
    fill(root, 'input[type="number"]', '10');
    button(root, 'Save policy')?.click();
    await settle(out.harness, 15);
    root = el(out.harness);
    expect(root.textContent).toContain('Last changed');
  });

  it('answers a support ticket and manages assignment and status', async () => {
    const out = await setup();
    await firstValueFrom(TestBed.inject(AuthApi).login(customer.email, customer.password));
    const ticket = await firstValueFrom(TestBed.inject(SupportApi).create({ subject: 'Wrong colour', message: 'I got blue, not black.', attachments: [] }));
    await firstValueFrom(TestBed.inject(AuthApi).logout());
    await out.auth.login(admin.email, admin.password);

    await out.harness.navigateByUrl('/support');
    await settle(out.harness);
    let root = el(out.harness);
    expect(root.textContent).toContain('Wrong colour');
    expect(root.textContent).toContain('Unassigned');
    expect(await violations(root)).toEqual([]);

    await out.harness.navigateByUrl(`/support/${ticket.id}`);
    await settle(out.harness);
    root = el(out.harness);
    expect(root.textContent).toContain('I got blue, not black.');
    expect(await violations(root)).toEqual([]);
    fill(root, 'textarea', 'Sorry about that, a replacement is on the way.');
    button(root, 'Send reply')?.click();
    await settle(out.harness, 15);
    root = el(out.harness);
    expect(root.textContent).toContain('a replacement is on the way');
    expect(root.textContent).toContain('Waiting for customer');
    expect(root.textContent).toContain(`Assigned to ${admin.name}`);

    button(root, 'Close ticket')?.click();
    await settle(out.harness, 15);
    root = el(out.harness);
    expect(root.textContent).toContain('Closed');
    expect(button(root, 'Send reply')).toBeUndefined();
    expect(button(root, 'Reopen')).toBeDefined();
  });
});
