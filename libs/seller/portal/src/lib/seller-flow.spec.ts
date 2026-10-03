import { vi } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import axe from 'axe-core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '@ecom/shared/core';
import { CartApi, DEMO_ACCOUNTS, OrderApi, loadCatalogData, provideDataAccess } from '@ecom/shared/data-access';
import { AuthStore } from '@ecom/shared/state';
import { sellerRoutes } from './seller.routes';

vi.setConfig({ testTimeout: 30_000 });
const config = { useMocks: true, mockLatencyMs: 0, apiBaseUrl: '', siteName: 'Seller Centre', siteUrl: 'http://x', features: {} };
const [customer, , seller] = DEMO_ACCOUNTS;

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
const button = (root: HTMLElement, text: string) => Array.from(root.querySelectorAll('button, a')).find((b) => b.textContent?.trim().startsWith(text)) as HTMLElement | undefined;
function fill(root: HTMLElement, selector: string, value: string) {
  const input = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (!input) throw new Error(`missing ${selector}`);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
function fillLabelled(root: HTMLElement, label: string, value: string) {
  const l = Array.from(root.querySelectorAll('label')).find((x) => x.textContent?.trim().startsWith(label));
  const control = l && root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${l.getAttribute('for')}`);
  if (!control) throw new Error(`no field labelled ${label}`);
  control.value = value;
  control.dispatchEvent(new Event('input', { bubbles: true }));
  control.dispatchEvent(new Event('change', { bubbles: true }));
}

async function setup() {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideRouter(sellerRoutes, withComponentInputBinding()), { provide: APP_CONFIG, useValue: config }, provideDataAccess({ useMocks: true })],
  });
  const auth = TestBed.inject(AuthStore);
  await auth.init();
  return { auth, harness: await RouterTestingHarness.create(), router: TestBed.inject(Router) };
}

describe('seller portal', () => {
  it('sends signed-out visitors to sign in and shows the seller their day after they do', async () => {
    const { harness, router } = await setup();
    await harness.navigateByUrl('/products');
    expect(router.url).toContain('/login');
    await settle(harness);
    let root = el(harness);
    expect(await violations(root)).toEqual([]);
    fill(root, 'input[type="email"]', seller.email);
    fill(root, 'input[type="password"]', 'wrong');
    button(root, 'Sign in')?.click();
    await settle(harness, 15);
    expect(root.textContent).toContain('Incorrect email or password.');
    fill(root, 'input[type="password"]', seller.password);
    button(root, 'Sign in')?.click();
    await settle(harness, 25);
    expect(router.url).toBe('/products'); // back to where they were headed
    await harness.navigateByUrl('/');
    await settle(harness, 15);
    root = el(harness);
    expect(root.textContent).toContain('Urban Threads');
    expect(root.textContent).toContain('Live listings');
    expect(root.textContent).toContain('Awaiting approval');
    expect(await violations(root)).toEqual([]);
  });

  it('keeps a customer who has not applied out of the working pages and invites them to apply', async () => {
    const { auth, harness, router } = await setup();
    await auth.login(customer.email, customer.password);
    await harness.navigateByUrl('/products');
    await settle(harness);
    expect(router.url).toBe('/'); // the permission guard sent them back
    expect(el(harness).textContent).toContain('Start selling');
    expect(Array.from(el(harness).querySelectorAll('nav a')).map((a) => a.textContent?.trim())).toEqual(['Overview']);
  });

  it('takes a new seller through applying, with field errors, then shows the review state', async () => {
    const { auth, harness, router } = await setup();
    await auth.register({ name: 'Lamp Lane', email: 'lamp@example.com', password: 'Lamp@1234' });
    await harness.navigateByUrl('/apply');
    await settle(harness);
    let root = el(harness);
    expect(await violations(root)).toEqual([]);

    button(root, 'Submit application')?.click();
    await settle(harness, 15);
    root = el(harness);
    expect(root.textContent).toContain('Enter a valid 15-character GSTIN');
    expect(root.textContent).toContain('Enter a valid 10-character PAN');

    const values: Record<string, string> = {
      'Store name': 'Lamp Lane',
      'Legal business name': 'Lamp Lane Traders',
      'Mobile number': '9811111111',
      GSTIN: '27AAAPL1234C1ZV',
      PAN: 'AAAPL1234C',
      Address: '9 Lamp Lane',
      City: 'Pune',
      State: 'Maharashtra',
      'Pin code': '411001',
      'Account holder name': 'Lamp Lane Traders',
      'Account number': '123456789012',
      'IFSC code': 'HDFC0001234',
      'Returns policy': '7-day returns',
      'Shipping policy': 'Ships in 2 days',
    };
    for (const [label, value] of Object.entries(values)) fillLabelled(root, label, value);
    button(root, 'Submit application')?.click();
    await settle(harness, 25);
    root = el(harness);
    expect(router.url).toBe('/');
    expect(root.textContent).toContain('Lamp Lane');
    expect(root.textContent).toContain('Awaiting review');
    expect(root.textContent).toContain('being reviewed');
    expect(localStorage.getItem('ecom.mock.sellers.v1')).not.toContain('123456789012');
  });

  it('lists the seller\'s products, validates a new one, and sends a draft for approval', async () => {
    const { auth, harness, router } = await setup();
    await auth.login(seller.email, seller.password);
    await harness.navigateByUrl('/products');
    await settle(harness);
    let root = el(harness);
    expect(root.textContent).toContain('Handloom Cotton Kurta');
    expect(root.textContent).toContain('Block-Print Cotton Dupatta');
    expect(root.textContent).toContain('Awaiting approval');
    expect(root.textContent).toContain('Items the store assigned to you');
    expect(await violations(root)).toEqual([]);

    await harness.navigateByUrl('/products/new');
    await settle(harness);
    root = el(harness);
    expect(await violations(root)).toEqual([]);
    button(root, 'Save')?.click();
    await settle(harness, 15);
    expect(el(harness).textContent).toContain('Give the product a title');

    fillLabelled(root, 'Title', 'Brass Diya Set');
    fillLabelled(root, 'Brand', 'Urban Threads');
    fillLabelled(root, 'Description', 'Hand-cast brass diyas.');
    fillLabelled(root, 'Price', '599');
    fillLabelled(root, 'Units in stock', '12');
    const category = root.querySelector<HTMLSelectElement>('select') as HTMLSelectElement;
    category.value = Array.from(category.options).find((o) => o.textContent?.includes('Home Decor'))?.value ?? '';
    category.dispatchEvent(new Event('change', { bubbles: true }));
    button(root, 'Save')?.click();
    await settle(harness, 25);
    expect(router.url).toBe('/products');
    root = el(harness);
    expect(root.textContent).toContain('Brass Diya Set');
    expect(root.textContent).toContain('Draft');

    button(root, 'Submit Brass Diya Set for approval')?.click();
    await settle(harness, 15);
    expect(el(harness).textContent).toContain('Brass Diya Set');
    expect(Array.from(el(harness).querySelectorAll('li')).find((li) => li.textContent?.includes('Brass Diya Set'))?.textContent).toContain('Awaiting approval');
  });

  it('shows a seller only their part of an order and moves it to delivered', async () => {
    const { auth, harness } = await setup();
    const { products } = await loadCatalogData();
    const variantOf = (id: string) => (products.find((p) => p.id === id)?.variants[0].id as string);
    await auth.login(customer.email, customer.password);
    await firstValueFrom(TestBed.inject(CartApi).add(variantOf('p-0010'), 1));
    await firstValueFrom(TestBed.inject(CartApi).add(variantOf('p-0100'), 1));
    await firstValueFrom(TestBed.inject(OrderApi).place({ idempotencyKey: 'k-ui', contact: { name: 'Asha Rao', email: customer.email, phone: '9876543210' }, address: { line1: '12 MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' }, paymentMethod: 'cod' }));
    await auth.logout();
    await auth.login(seller.email, seller.password);

    await harness.navigateByUrl('/orders');
    await settle(harness);
    let root = el(harness);
    expect(root.querySelectorAll('section ul > li, main > ul > li, ul.space-y-4 > li')).toHaveLength(1);
    expect(root.textContent).toContain('Asha Rao');
    expect(root.textContent).toContain('560001');
    expect(root.textContent).not.toContain(customer.email);
    expect(await violations(root)).toEqual([]);

    button(root, 'Mark as packed')?.click();
    await settle(harness, 15);
    root = el(harness);
    expect(root.textContent).toContain('Packed');
    button(root, 'Mark as shipped')?.click();
    await settle(harness, 15);
    expect(el(harness).textContent).toContain('Enter a valid tracking number');
    fill(root, 'input[autocomplete="off"]', 'DLV123456');
    button(root, 'Mark as shipped')?.click();
    await settle(harness, 15);
    root = el(harness);
    expect(root.textContent).toContain('DLV123456');
    button(root, 'Mark as delivered')?.click();
    await settle(harness, 15);
    expect(el(harness).textContent).toContain('Delivered');
    expect(button(el(harness), 'Mark as')).toBeUndefined();

    await harness.navigateByUrl('/payouts');
    await settle(harness);
    root = el(harness);
    expect(root.textContent).toContain('Not yet on a statement');
    expect(root.textContent).toMatch(/delivered .*less \d+(\.\d+)?% commission/);
    expect(root.textContent).toContain('No statements have been issued to you yet.');
    expect(await violations(root)).toEqual([]);
  });
});
