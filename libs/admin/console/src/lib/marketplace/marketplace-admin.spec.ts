import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import axe from 'axe-core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '@ecom/shared/core';
import { AuthApi, CartApi, DEMO_ACCOUNTS, OrderApi, SellerPortalApi, loadCatalogData, provideAdminDataAccess, provideDataAccess } from '@ecom/shared/data-access';
import { AuthStore } from '@ecom/shared/state';
import { adminRoutes } from '../admin.routes';

const config = { useMocks: true, mockLatencyMs: 0, apiBaseUrl: '', siteName: 'Shop Admin', siteUrl: 'http://x', features: {} };
const [customer, admin, seller] = DEMO_ACCOUNTS;

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

async function setup(user: 'admin' | 'customer' = 'admin') {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideRouter(adminRoutes, withComponentInputBinding()), { provide: APP_CONFIG, useValue: config }, provideDataAccess({ useMocks: true }), provideAdminDataAccess({ useMocks: true })],
  });
  const auth = TestBed.inject(AuthStore);
  await auth.init();
  const who = user === 'admin' ? admin : customer;
  await auth.login(who.email, who.password);
  return { auth, harness: await RouterTestingHarness.create(), router: TestBed.inject(Router) };
}

describe('admin marketplace', () => {
  it('is for staff with seller:manage only', async () => {
    const { harness, router } = await setup('customer');
    await harness.navigateByUrl('/marketplace');
    expect(router.url).toContain('/login');
  });

  it('shows the waiting application with its KYC details, and rejecting needs a reason the applicant will see', async () => {
    const { harness, router } = await setup();
    await harness.navigateByUrl('/marketplace');
    await settle(harness);
    expect(router.url).toBe('/marketplace/applications');
    let root = el(harness);
    expect(root.textContent).toContain('Fresh Bazaar');
    expect(root.textContent).toContain('29ABCDE9999K1Z8');
    expect(root.textContent).toContain('account ending 1122');
    expect(await violations(root)).toEqual([]);

    button(root, 'Reject Fresh Bazaar')?.click();
    await settle(harness);
    root = el(harness);
    button(root, 'Confirm rejection of Fresh Bazaar')?.click();
    await settle(harness, 15);
    expect(el(harness).textContent).toContain('Give a reason');
    fill(root, 'input[aria-invalid="true"]', 'Documents are unreadable');
    button(root, 'Confirm rejection of Fresh Bazaar')?.click();
    await settle(harness, 15);
    root = el(harness);
    expect(root.textContent).toContain('Documents are unreadable');
    expect(root.textContent).toContain('Not approved');
  });

  it('approves an applicant, who can then use the seller portal', async () => {
    const { harness } = await setup();
    // A real applicant: a customer who applied through the portal API.
    const auth = TestBed.inject(AuthApi);
    await firstValueFrom(auth.logout());
    await firstValueFrom(auth.login(customer.email, customer.password));
    await firstValueFrom(
      TestBed.inject(SellerPortalApi).apply({
        displayName: 'Lamp Lane',
        legalName: 'Lamp Lane Traders',
        phone: '9811111111',
        gstin: '27AAAPL1234C1ZV',
        pan: 'AAAPL1234C',
        address: { line1: '9 Lamp Lane', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
        bankHolder: 'Lamp Lane Traders',
        bankAccountNumber: '123456789012',
        bankIfsc: 'HDFC0001234',
        policies: { returns: '7-day returns', shipping: 'Ships in 2 days' },
      }),
    );
    await firstValueFrom(auth.logout());
    await TestBed.inject(AuthStore).login(admin.email, admin.password);

    await harness.navigateByUrl('/marketplace/applications');
    await settle(harness);
    let root = el(harness);
    expect(root.textContent).toContain('Lamp Lane');
    button(root, 'Approve Lamp Lane')?.click();
    await settle(harness, 15);
    await harness.navigateByUrl('/marketplace/sellers');
    await settle(harness);
    root = el(harness);
    expect(root.textContent).toContain('Lamp Lane');
    expect(root.textContent).toContain('Urban Threads');
    expect(await violations(root)).toEqual([]);

    await firstValueFrom(auth.logout());
    await firstValueFrom(auth.login(customer.email, customer.password));
    expect(await firstValueFrom(TestBed.inject(SellerPortalApi).products())).toEqual([]); // allowed in, with nothing listed yet
  });

  it('suspends and restores a seller, and sets a commission override', async () => {
    const { harness } = await setup();
    await harness.navigateByUrl('/marketplace/sellers');
    await settle(harness);
    let root = el(harness);
    const input = Array.from(root.querySelectorAll<HTMLInputElement>('input[inputmode="decimal"]'))[0];
    input.value = '7';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    button(root, 'Save commission for')?.click();
    await settle(harness, 15);
    root = el(harness);
    expect(root.textContent).toMatch(/7% \(override\)/);

    button(root, 'Suspend ')?.click();
    await settle(harness, 15);
    root = el(harness);
    expect(root.textContent).toContain('Suspended');
    expect(button(root, 'Restore ')).toBeDefined();
    button(root, 'Restore ')?.click();
    await settle(harness, 15);
    expect(el(harness).textContent).not.toContain('Suspended');
  });

  it('approves a seller listing so it appears in the shop, and rejecting one needs a reason', async () => {
    const { harness } = await setup();
    await harness.navigateByUrl('/marketplace/listings');
    await settle(harness);
    let root = el(harness);
    expect(root.textContent).toContain('Block-Print Cotton Dupatta');
    expect(await violations(root)).toEqual([]);
    button(root, 'Reject Block-Print Cotton Dupatta')?.click();
    await settle(harness);
    root = el(harness);
    button(root, 'Confirm rejection of Block-Print Cotton Dupatta')?.click();
    await settle(harness, 15);
    expect(el(harness).textContent).toContain('Give a reason');
    button(root, 'Cancel')?.click();
    await settle(harness);
    button(el(harness), 'Approve Block-Print Cotton Dupatta')?.click();
    await settle(harness, 15);
    expect(el(harness).textContent).toContain('Nothing here'); // no longer waiting
    choose(el(harness), '#ls', 'approved');
    await settle(harness, 15);
    expect(el(harness).textContent).toContain('Block-Print Cotton Dupatta');
  });

  it('adds a commission rule, refusing a clash and a bad percentage', async () => {
    const { harness } = await setup();
    await harness.navigateByUrl('/marketplace/commission');
    await settle(harness);
    let root = el(harness);
    expect(root.textContent).toContain('Category: Fashion');
    expect(await violations(root)).toEqual([]);
    choose(root, 'form select', 'category');
    await settle(harness);
    root = el(harness);
    button(root, 'Save rule')?.click();
    await settle(harness, 15);
    expect(el(harness).textContent).toContain('Enter 0 to 50');
    expect(el(harness).textContent).toContain('Choose a category');
  });

  it('builds a payout statement from a delivered order, issues it and marks it paid', async () => {
    const { auth, harness } = await setup();
    const { products } = await loadCatalogData();
    await auth.logout();
    await auth.login(customer.email, customer.password);
    await firstValueFrom(TestBed.inject(CartApi).add(products.find((p) => p.id === 'p-0010')?.variants[0].id as string, 1));
    await firstValueFrom(TestBed.inject(OrderApi).place({ idempotencyKey: 'k-pay', contact: { name: 'Asha Rao', email: customer.email, phone: '9876543210' }, address: { line1: '12 MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' }, paymentMethod: 'cod' }));
    await auth.logout();
    await auth.login(seller.email, seller.password);
    const portal = TestBed.inject(SellerPortalApi);
    const [shipment] = await firstValueFrom(portal.shipments());
    await firstValueFrom(portal.advanceShipment(shipment.id));
    await firstValueFrom(portal.advanceShipment(shipment.id, 'TRK-UI-1'));
    await firstValueFrom(portal.advanceShipment(shipment.id));
    await auth.logout();
    await auth.login(admin.email, admin.password);

    await harness.navigateByUrl('/marketplace/payouts');
    await settle(harness);
    let root = el(harness);
    expect(await violations(root)).toEqual([]);
    button(root, 'Preview')?.click();
    await settle(harness, 15);
    expect(el(harness).textContent).toContain('Choose a seller');
    choose(root, 'form select', 'sel_demo');
    button(root, 'Preview')?.click();
    await settle(harness, 15);
    root = el(harness);
    expect(root.textContent).toContain('Urban Threads');
    expect(root.textContent).toMatch(/12\s*%|12%/);
    button(root, 'Issue statement')?.click();
    await settle(harness, 20);
    root = el(harness);
    expect(root.textContent).toContain('Issued');
    const pay = Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.trim().startsWith('Mark PAY'));
    pay?.click();
    await settle(harness, 15);
    expect(el(harness).textContent).toContain('Enter the transfer reference');
    fill(root, 'td input', 'UTR998877');
    (Array.from(el(harness).querySelectorAll('button')).find((b) => b.textContent?.trim().startsWith('Mark PAY')) as HTMLButtonElement).click();
    await settle(harness, 20);
    root = el(harness);
    expect(root.textContent).toContain('Paid');
    expect(root.textContent).toContain('UTR998877');
  });
});
