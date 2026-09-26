import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import axe from 'axe-core';
import { APP_CONFIG } from '@ecom/shared/core';
import { DEMO_ACCOUNTS, provideAdminDataAccess, provideDataAccess } from '@ecom/shared/data-access';
import { AuthStore } from '@ecom/shared/state';
import { adminRoutes } from './admin.routes';

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

async function setup(signIn: 'admin' | 'customer' | 'none' = 'admin') {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideRouter(adminRoutes, withComponentInputBinding()), { provide: APP_CONFIG, useValue: config }, provideDataAccess({ useMocks: true }), provideAdminDataAccess({ useMocks: true })],
  });
  const auth = TestBed.inject(AuthStore);
  await auth.init();
  if (signIn === 'admin') await auth.login(admin.email, admin.password);
  if (signIn === 'customer') await auth.login(customer.email, customer.password);
  return { harness: await RouterTestingHarness.create(), auth, router: TestBed.inject(Router) };
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

describe('admin console', () => {
  it('sends signed-out users to the admin sign in and refuses customer accounts', async () => {
    const out = await setup('none');
    await out.harness.navigateByUrl('/orders');
    expect(out.router.url).toContain('/login');
    await settle(out.harness);
    let root = el(out.harness);
    expect(await violations(root)).toEqual([]);
    fill(root, '[formcontrolname="email"]', customer.email);
    fill(root, '[formcontrolname="password"]', customer.password);
    button(root, 'Sign in')?.click();
    await settle(out.harness, 20);
    root = el(out.harness);
    expect(root.textContent).toContain('does not have access');
    expect(out.auth.loggedIn()).toBe(false);

    fill(root, '[formcontrolname="email"]', admin.email);
    fill(root, '[formcontrolname="password"]', admin.password);
    button(root, 'Sign in')?.click();
    await settle(out.harness, 20);
    expect(out.router.url).toBe('/orders'); // returns to the page that was asked for
  });

  it('blocks a signed-in customer from every admin page', async () => {
    const out = await setup('customer');
    await out.harness.navigateByUrl('/products');
    expect(out.router.url).toContain('/login');
  });

  it('dashboard shows key figures, chart summary and lists, and has no serious a11y issues', async () => {
    const out = await setup();
    await out.harness.navigateByUrl('/');
    await settle(out.harness, 20);
    const root = el(out.harness);
    expect(root.textContent).toContain('Revenue');
    expect(root.textContent).toContain('Average order value');
    expect(root.querySelector('svg[role="img"]')?.getAttribute('aria-label')).toContain('Bar chart of revenue per day over 30 days');
    expect(root.querySelectorAll('svg rect').length).toBe(30);
    expect(root.textContent).toContain('Top products');
    expect(await violations(root)).toEqual([]);

    const select = root.querySelector<HTMLSelectElement>('#period');
    if (select) {
      select.value = '7';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    await settle(out.harness, 15);
    expect(root.querySelectorAll('svg rect').length).toBe(7);
  }, 30000);

  it('products: lists, filters by status through the URL, bulk publishes, and edits with validation', async () => {
    const out = await setup();
    await out.harness.navigateByUrl('/products');
    await settle(out.harness, 15);
    let root = el(out.harness);
    expect(root.querySelectorAll('tbody tr').length).toBe(20);
    expect(await violations(root)).toEqual([]);

    // select two rows, archive them
    const boxes = root.querySelectorAll<HTMLInputElement>('tbody input[type="checkbox"]');
    boxes[0].click();
    boxes[1].click();
    await settle(out.harness);
    expect(root.textContent).toContain('2 selected');
    button(root, 'Archive')?.click();
    await settle(out.harness, 15);
    await out.harness.navigateByUrl('/products?status=archived');
    await settle(out.harness, 15);
    root = el(out.harness);
    expect(root.querySelectorAll('tbody tr').length).toBe(2);

    // open the first product and try to save invalid data
    const href = root.querySelector('tbody a')?.getAttribute('href') ?? '';
    await out.harness.navigateByUrl(href);
    await settle(out.harness, 15);
    root = el(out.harness);
    expect(root.querySelector('h1')?.textContent).toContain('Edit product');
    expect(await violations(root)).toEqual([]);
    fill(root, '[formcontrolname="title"]', '');
    fill(root, '[formcontrolname="price"]', '0');
    button(root, 'Save changes')?.click();
    await settle(out.harness, 15);
    expect(root.textContent).toContain('Please check the highlighted fields.');
    expect(root.textContent).toContain('Price must be greater than zero');

    fill(root, '[formcontrolname="title"]', 'Updated title');
    fill(root, '[formcontrolname="price"]', '999');
    button(root, 'Save changes')?.click();
    await settle(out.harness, 15);
    expect(root.textContent).not.toContain('Please check the highlighted fields.');
  }, 40000);

  it('creates a product through the form and lands on its edit page', async () => {
    const out = await setup();
    await out.harness.navigateByUrl('/products/new');
    await settle(out.harness, 15);
    const root = el(out.harness);
    expect(root.querySelector('h1')?.textContent).toContain('New product');
    const category = root.querySelector<HTMLSelectElement>('[formcontrolname="categoryId"]');
    if (category) {
      category.value = category.options[1].value;
      category.dispatchEvent(new Event('change', { bubbles: true }));
    }
    fill(root, '[formcontrolname="title"]', 'Brand New Gadget');
    fill(root, '[formcontrolname="brandName"]', 'Ferro');
    fill(root, '[formcontrolname="sku"]', 'NEW-GADGET-1');
    fill(root, '[formcontrolname="price"]', '1499');
    fill(root, '[formcontrolname="stock"]', '12');
    button(root, 'Create product')?.click();
    await settle(out.harness, 20);
    expect(out.router.url).toMatch(/^\/products\/p-new-/);
  }, 30000);

  it('orders: filter, open, advance through allowed steps, add a note', async () => {
    const out = await setup();
    await out.harness.navigateByUrl('/orders?status=confirmed');
    await settle(out.harness, 15);
    let root = el(out.harness);
    expect(root.querySelectorAll('tbody tr').length).toBeGreaterThan(0);
    expect(await violations(root)).toEqual([]);
    const href = root.querySelector('tbody a')?.getAttribute('href') ?? '';
    await out.harness.navigateByUrl(href);
    await settle(out.harness, 15);
    root = el(out.harness);
    expect(root.textContent).toContain('Mark as packed');
    expect(root.textContent).not.toContain('Mark as delivered');
    expect(await violations(root)).toEqual([]);
    button(root, 'Mark as packed')?.click();
    await settle(out.harness, 15);
    expect(root.textContent).toContain('Mark as shipped');
    fill(root, 'input[maxlength="500"]', 'Called the customer');
    button(root, 'Add note')?.click();
    await settle(out.harness, 15);
    expect(root.textContent).toContain('Called the customer');
  }, 40000);

  it('coupons: create with validation, users: grant admin, audit log lists the changes', async () => {
    const out = await setup();
    await out.harness.navigateByUrl('/coupons');
    await settle(out.harness, 15);
    let root = el(out.harness);
    expect(root.textContent).toContain('WELCOME10');
    expect(await violations(root)).toEqual([]);
    button(root, 'New coupon')?.click();
    await settle(out.harness);
    fill(root, '[formcontrolname="code"]', 'x');
    fill(root, '[formcontrolname="description"]', 'Test');
    button(root, 'Save coupon')?.click();
    await settle(out.harness, 15);
    expect(root.textContent).toContain('Use 3 to 20 letters or numbers');
    fill(root, '[formcontrolname="code"]', 'SAVE20');
    button(root, 'Save coupon')?.click();
    await settle(out.harness, 15);
    expect(root.textContent).toContain('SAVE20');

    await out.harness.navigateByUrl('/users');
    await settle(out.harness, 15);
    root = el(out.harness);
    expect(await violations(root)).toEqual([]);
    const grant = Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.includes('Grant admin'));
    grant?.click();
    await settle(out.harness, 15);
    expect(root.textContent).toContain('Revoke admin');

    await out.harness.navigateByUrl('/audit');
    await settle(out.harness, 15);
    root = el(out.harness);
    expect(root.textContent).toContain('coupon.create');
    expect(root.textContent).toContain('user.role');
    expect(await violations(root)).toEqual([]);

    await out.harness.navigateByUrl('/settings');
    await settle(out.harness, 10);
    expect(el(out.harness).textContent).toContain('Razorpay');
  }, 60000);

  it('review moderation: shows the flagged queue, approves and rejects, and is accessible', async () => {
    const out = await setup();
    await out.harness.navigateByUrl('/reviews');
    await settle(out.harness, 15);
    const root = el(out.harness);
    expect(root.querySelectorAll('main li, ul > li').length).toBeGreaterThan(5);
    expect(root.textContent).toContain('Contains a link');
    expect(root.textContent).toContain('Contains blocked language');
    expect(await violations(root)).toEqual([]);

    button(root, 'Approve')?.click();
    await settle(out.harness, 15);
    button(root, 'Reject')?.click();
    await settle(out.harness, 15);
    expect(root.textContent).toContain('7 reviews'.replace('7', '6'));

    await out.harness.navigateByUrl('/reviews?status=approved');
    await settle(out.harness, 15);
    expect(el(out.harness).querySelectorAll('li').length).toBeGreaterThan(0);
    expect(el(out.harness).textContent).toContain('1 reviews');
  }, 40000);

  it('content: banners, sections, pages (with live safe preview), links and redirects', async () => {
    const out = await setup();
    await out.harness.navigateByUrl('/content');
    await settle(out.harness, 15);
    expect(out.router.url).toBe('/content/banners');
    let root = el(out.harness);
    expect(root.querySelectorAll('ol[aria-label="Banners in display order"] li')).toHaveLength(4);
    expect(await violations(root)).toEqual([]);

    // banner validation and create
    button(root, 'New banner')?.click();
    await settle(out.harness);
    fill(root, '[formcontrolname="title"]', 'Festive sale');
    fill(root, '[formcontrolname="link"]', 'javascript:alert(1)');
    button(root, 'Save banner')?.click();
    await settle(out.harness, 15);
    expect(root.textContent).toContain('Use an internal path');
    expect(root.textContent).toContain('Describe the image for screen readers');
    fill(root, '[formcontrolname="link"]', '/collections/trending');
    fill(root, '[formcontrolname="imageAlt"]', 'A festive banner');
    button(root, 'Save banner')?.click();
    await settle(out.harness, 20);
    expect(root.querySelectorAll('ol[aria-label="Banners in display order"] li')).toHaveLength(5);

    // sections
    await out.harness.navigateByUrl('/content/sections');
    await settle(out.harness, 15);
    root = el(out.harness);
    expect(await violations(root)).toEqual([]);
    root.querySelector<HTMLInputElement>('ol li input[type="checkbox"]')?.click();
    await settle(out.harness);
    button(root, 'Save sections')?.click();
    await settle(out.harness, 15);

    // pages: the preview never runs scripts
    await out.harness.navigateByUrl('/content/pages');
    await settle(out.harness, 15);
    root = el(out.harness);
    expect(root.textContent).toContain('/pages/about');
    button(root, 'New page')?.click();
    await settle(out.harness);
    fill(root, '[formcontrolname="title"]', 'Shipping');
    fill(root, '[formcontrolname="slug"]', 'shipping');
    fill(root, '[formcontrolname="source"]', '## Rates\n\n<script>alert(1)</script> and **bold**');
    await settle(out.harness);
    const preview = root.querySelector('[aria-labelledby="preview-h"]') as HTMLElement;
    expect(preview.innerHTML).toContain('<h2>Rates</h2>');
    expect(preview.querySelector('script')).toBeNull();
    expect(await violations(root)).toEqual([]);
    button(root, 'Save page')?.click();
    await settle(out.harness, 20);
    expect(root.textContent).toContain('/pages/shipping');
    expect(root.textContent).toContain('draft');

    // links
    await out.harness.navigateByUrl('/content/links');
    await settle(out.harness, 15);
    root = el(out.harness);
    expect(await violations(root)).toEqual([]);
    button(root, 'Add link')?.click();
    await settle(out.harness);
    button(root, 'Save links')?.click();
    await settle(out.harness, 15);
    expect(root.textContent).toContain('Label is required');

    // redirects
    await out.harness.navigateByUrl('/content/redirects');
    await settle(out.harness, 15);
    root = el(out.harness);
    expect(await violations(root)).toEqual([]);
    fill(root, '[formcontrolname="from"]', '/old-page');
    fill(root, '[formcontrolname="to"]', '/pages/about');
    button(root, 'Add redirect')?.click();
    await settle(out.harness, 15);
    expect(root.textContent).toContain('/old-page');
    fill(root, '[formcontrolname="from"]', '/pages/about');
    fill(root, '[formcontrolname="to"]', '/old-page');
    button(root, 'Add redirect')?.click();
    await settle(out.harness, 15);
    expect(root.textContent).toContain('Creates a redirect loop');
  }, 60000);

  it('inventory: stock table, adjustment with a required reason, ledger, import report and settings', async () => {
    const out = await setup();
    await out.harness.navigateByUrl('/inventory');
    await settle(out.harness, 15);
    expect(out.router.url).toBe('/inventory/stock');
    let root = el(out.harness);
    expect(root.querySelectorAll('tbody tr')).toHaveLength(20);
    expect(await violations(root)).toEqual([]);

    // open the editor for the first row and try to save without a reason
    (Array.from(root.querySelectorAll('tbody button')).find((b) => b.textContent?.startsWith('Manage')) as HTMLButtonElement).click();
    await settle(out.harness);
    fill(root, '[formcontrolname="quantity"]', '5');
    button(root, 'Record change')?.click();
    await settle(out.harness, 15);
    expect(root.textContent).toContain('Please check the highlighted fields.');
    expect(root.textContent).toContain('Choose a reason');
    expect(await violations(root)).toEqual([]);

    const reason = root.querySelector<HTMLSelectElement>('[formcontrolname="reason"]') as HTMLSelectElement;
    reason.value = 'received_shipment';
    reason.dispatchEvent(new Event('change', { bubbles: true }));
    button(root, 'Record change')?.click();
    await settle(out.harness, 20);
    expect(root.querySelector('[aria-label="Adjust stock"]')).toBeNull(); // editor closes after saving

    // the ledger shows the entry
    await out.harness.navigateByUrl('/inventory/ledger');
    await settle(out.harness, 15);
    root = el(out.harness);
    expect(root.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(root.textContent).toContain('Received shipment');
    expect(root.textContent).toContain('+5');
    expect(await violations(root)).toEqual([]);

    // import: a bad row is reported
    await out.harness.navigateByUrl('/inventory/import');
    await settle(out.harness, 15);
    root = el(out.harness);
    expect(await violations(root)).toEqual([]);
    const csv = root.querySelector<HTMLTextAreaElement>('#csv') as HTMLTextAreaElement;
    csv.value = 'sku,location,on_hand\nNOPE-1,Main warehouse,3';
    csv.dispatchEvent(new Event('input', { bubbles: true }));
    button(root, 'Import stock levels')?.click();
    await settle(out.harness, 15);
    expect(root.textContent).toContain('0 row(s) applied, 1 skipped');
    expect(root.textContent).toContain('Unknown SKU');

    // settings
    await out.harness.navigateByUrl('/inventory/settings');
    await settle(out.harness, 15);
    root = el(out.harness);
    expect(await violations(root)).toEqual([]);
    fill(root, '[formcontrolname="reservationMinutes"]', '0');
    button(root, 'Save settings')?.click();
    await settle(out.harness, 15);
    expect(root.textContent).toContain('Use a whole number from 1 to 1,440 minutes');
    fill(root, '[formcontrolname="reservationMinutes"]', '20');
    button(root, 'Save settings')?.click();
    await settle(out.harness, 15);
    expect(root.textContent).not.toContain('Use a whole number');
  }, 60000);
});
