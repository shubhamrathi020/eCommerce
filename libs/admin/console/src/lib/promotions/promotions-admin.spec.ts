import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import axe from 'axe-core';
import { APP_CONFIG } from '@ecom/shared/core';
import { DEMO_ACCOUNTS, loadCatalogData, provideAdminDataAccess, provideDataAccess } from '@ecom/shared/data-access';
import { AuthStore } from '@ecom/shared/state';
import { adminRoutes } from '../admin.routes';


const config = { useMocks: true, mockLatencyMs: 0, apiBaseUrl: '', siteName: 'Shop Admin', siteUrl: 'http://x', features: {} };
const admin = DEMO_ACCOUNTS[1];
const customer = DEMO_ACCOUNTS[0];

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

async function setup(signIn: 'admin' | 'customer' = 'admin') {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideRouter(adminRoutes, withComponentInputBinding()), { provide: APP_CONFIG, useValue: config }, provideDataAccess({ useMocks: true }), provideAdminDataAccess({ useMocks: true })],
  });
  const auth = TestBed.inject(AuthStore);
  await auth.init();
  await auth.login(signIn === 'admin' ? admin.email : customer.email, signIn === 'admin' ? admin.password : customer.password);
  return { harness: await RouterTestingHarness.create(), router: TestBed.inject(Router) };
}

describe('admin promotions', () => {
  it('is for staff with promotion:manage only', async () => {
    const { harness, router } = await setup('customer');
    await harness.navigateByUrl('/promotions');
    expect(router.url).toContain('/login');
  });

  it('lists the promotions, pauses and resumes one, and is accessible', async () => {
    const { harness, router } = await setup();
    await harness.navigateByUrl('/promotions');
    await settle(harness);
    expect(router.url).toBe('/promotions/list');
    let root = el(harness);
    expect(root.textContent).toContain('Snack attack');
    expect(root.textContent).toContain('Flash deal');
    expect(await violations(root)).toEqual([]);

    button(root, 'Pause Snack attack')?.click();
    await settle(harness, 15);
    root = el(harness);
    expect(button(root, 'Resume Snack attack')).toBeDefined();
    button(root, 'Resume Snack attack')?.click();
    await settle(harness, 15);
    expect(button(el(harness), 'Pause Snack attack')).toBeDefined();
  });

  it('creates a promotion through the form, showing the API field errors first', async () => {
    const { harness, router } = await setup();
    await harness.navigateByUrl('/promotions/list/new');
    await settle(harness);
    let root = el(harness);
    expect(await violations(root)).toEqual([]);

    fill(root, 'input[aria-describedby]:not([type])', '');
    button(root, 'Save promotion')?.click();
    await settle(harness, 15);
    root = el(harness);
    expect(root.textContent).toContain('Give the promotion a name');
    expect(root.textContent).toContain('Choose at least one category');

    fill(root, 'input[aria-invalid="true"]', 'Books week');
    root.querySelector<HTMLInputElement>('fieldset input[type="checkbox"]')?.click();
    button(root, 'Save promotion')?.click();
    await settle(harness, 20);
    expect(router.url).toBe('/promotions/list');
    expect(el(harness).textContent).toContain('Books week');
  });

  it('edits an existing flash deal and keeps its type fixed', async () => {
    const { harness, router } = await setup();
    await harness.navigateByUrl('/promotions/list/promo-flash-tee');
    await settle(harness);
    let root = el(harness);
    expect(root.querySelector<HTMLSelectElement>('main select')?.disabled).toBe(true);
    expect(root.textContent).toContain('Units at the deal price');
    expect(await violations(root)).toEqual([]);
    const price = Array.from(root.querySelectorAll<HTMLInputElement>('input')).find((i) => i.value === '1799') as HTMLInputElement;
    expect(price).toBeDefined();
    fill(root, `#${price.id}`, '99999999');
    button(root, 'Save promotion')?.click();
    await settle(harness, 15);
    root = el(harness);
    expect(root.textContent).toContain('must be below the current price');
    expect(router.url).toBe('/promotions/list/promo-flash-tee');
  });

  it('simulates a cart and explains every rule', async () => {
    const { harness } = await setup();
    const { products } = await loadCatalogData();
    const tee = products.find((p) => p.id === 'p-0001')?.variants[0].id as string;
    await harness.navigateByUrl('/promotions/simulator');
    await settle(harness);
    let root = el(harness);
    expect(await violations(root)).toEqual([]);

    fill(root, 'input[type="search"]', 'Signature Linen Relaxed T-Shirt');
    await settle(harness);
    choose(root, 'fieldset select', tee);
    fill(root, 'fieldset input', '2');
    button(root, 'Run simulation')?.click();
    await settle(harness, 15);
    root = el(harness);
    expect(root.textContent).toContain('Why each rule did or did not apply');
    expect(root.textContent).toContain('Flash deal: signature tee');
    expect(root.textContent).toContain('Applied');
    expect(root.textContent).toContain('No matching items in the cart');
    expect(await violations(root)).toEqual([]);
  });

  it('issues gift cards with validation and shows each history', async () => {
    const { harness } = await setup();
    await harness.navigateByUrl('/promotions/gift-cards');
    await settle(harness);
    let root = el(harness);
    expect(root.textContent).toContain('GIFT500');
    expect(await violations(root)).toEqual([]);

    fill(root, 'input[inputmode="decimal"]', '5');
    button(root, 'Issue card')?.click();
    await settle(harness, 15);
    expect(el(harness).textContent).toContain('Enter an amount from ₹100 to ₹50,000');

    fill(root, 'input[inputmode="decimal"]', '750');
    fill(root, 'input:not([inputmode]):not([type])', 'SPRING750');
    button(root, 'Issue card')?.click();
    await settle(harness, 15);
    root = el(harness);
    expect(root.textContent).toContain('SPRING750');
    button(root, 'History for SPRING750')?.click();
    await settle(harness);
    expect(el(harness).textContent).toContain('issue');
    expect(await violations(el(harness))).toEqual([]);
  });

  it('shows the price-health report (empty for the clean demo catalog)', async () => {
    const { harness } = await setup();
    await harness.navigateByUrl('/promotions/price-health');
    await settle(harness);
    expect(el(harness).textContent).toContain('No misleading discounts');
    expect(await violations(el(harness))).toEqual([]);
  });
});
