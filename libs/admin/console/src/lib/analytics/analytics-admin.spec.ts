import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import axe from 'axe-core';
import { APP_CONFIG } from '@ecom/shared/core';
import { DEMO_ACCOUNTS, MockMailbox, provideAdminDataAccess, provideDataAccess } from '@ecom/shared/data-access';
import { AuthStore } from '@ecom/shared/state';
import { adminRoutes } from '../admin.routes';

const config = { useMocks: true, mockLatencyMs: 0, apiBaseUrl: '', siteName: 'Shop Admin', siteUrl: 'http://x', storefrontUrl: 'http://shop.test', features: {} };

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

async function setup(user: 'admin' | 'customer' = 'admin') {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideRouter(adminRoutes, withComponentInputBinding()), { provide: APP_CONFIG, useValue: config }, provideDataAccess({ useMocks: true }), provideAdminDataAccess({ useMocks: true })],
  });
  const auth = TestBed.inject(AuthStore);
  await auth.init();
  const account = user === 'admin' ? DEMO_ACCOUNTS[1] : DEMO_ACCOUNTS[0];
  await auth.login(account.email, account.password);
  return { harness: await RouterTestingHarness.create(), router: TestBed.inject(Router) };
}

describe('admin analytics', () => {
  it('is for staff with analytics:read only', async () => {
    const { harness, router } = await setup('customer');
    await harness.navigateByUrl('/analytics');
    expect(router.url).toContain('/login');
  });

  it('shows the funnel for the chosen period and keeps the period when moving between reports', async () => {
    const { harness, router } = await setup();
    await harness.navigateByUrl('/analytics');
    await settle(harness);
    expect(router.url).toBe('/analytics/funnel');
    let root = el(harness);
    expect(root.textContent).toContain('Viewed a product');
    expect(root.textContent).toContain('Placed an order');
    expect(await violations(root)).toEqual([]);

    const period = root.querySelector<HTMLSelectElement>('#period') as HTMLSelectElement;
    period.value = '7';
    period.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(harness);
    expect(router.url).toContain('days=7');
    root = el(harness);
    expect(root.querySelector('caption')?.textContent).toContain('last 7 days');

    Array.from(root.querySelectorAll<HTMLAnchorElement>('nav[aria-label="Analytics sections"] a')).find((a) => a.textContent?.trim() === 'Products')?.click();
    await settle(harness);
    expect(router.url).toContain('/analytics/products');
    expect(router.url).toContain('days=7');
  });

  it('sorts the product table by a column from its header and paginates', async () => {
    const { harness, router } = await setup();
    await harness.navigateByUrl('/analytics/products');
    await settle(harness);
    let root = el(harness);
    expect(root.querySelectorAll('tbody tr')).toHaveLength(25);
    expect(root.querySelector('th[aria-sort="descending"]')?.textContent).toContain('Units sold');
    expect(await violations(root)).toEqual([]);

    button(root, 'Views')?.click();
    await settle(harness);
    expect(router.url).toContain('sort=views');
    root = el(harness);
    expect(root.querySelector('th[aria-sort="descending"]')?.textContent).toContain('Views');
    const views = Array.from(root.querySelectorAll('tbody tr')).map((tr) => Number(tr.querySelectorAll('td')[1].textContent));
    expect([...views].sort((a, b) => b - a)).toEqual(views);

    button(root, 'Views')?.click();
    await settle(harness);
    expect(el(harness).querySelector('th[aria-sort="ascending"]')?.textContent).toContain('Views');
  });

  it('lists searches that find nothing, linking each to the shop search with the term encoded', async () => {
    const { harness } = await setup();
    await harness.navigateByUrl('/analytics/search');
    await settle(harness);
    const root = el(harness);
    expect(root.textContent).toContain('Searches with no results');
    const link = root.querySelector<HTMLAnchorElement>('section[aria-labelledby="zero-h"] a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toMatch(/^http:\/\/shop\.test\/search\?q=[^&<> ]+$/);
    expect(link.rel).toContain('noopener');
    expect(await violations(root)).toEqual([]);
  });

  it('shows campaigns and cohorts accessibly', async () => {
    const { harness } = await setup();
    await harness.navigateByUrl('/analytics/campaigns');
    await settle(harness);
    expect(el(harness).textContent).toContain('first touch');
    expect(await violations(el(harness))).toEqual([]);
    await harness.navigateByUrl('/analytics/cohorts');
    await settle(harness);
    expect(el(harness).textContent).toContain('First order week');
    expect(await violations(el(harness))).toEqual([]);
  });

  it('schedules a report and delivers it to the mock mailbox on demand', async () => {
    const { harness } = await setup();
    await harness.navigateByUrl('/analytics/reports');
    await settle(harness);
    let root = el(harness);
    expect(await violations(root)).toEqual([]);

    const email = root.querySelector<HTMLInputElement>('input[type="email"]') as HTMLInputElement;
    email.value = 'nope';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    button(root, 'Schedule')?.click();
    await settle(harness, 15);
    expect(root.textContent).toContain('Enter a valid email address');

    email.value = 'owner@shop.test';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    button(root, 'Schedule')?.click();
    await settle(harness, 15);
    root = el(harness);
    expect(root.textContent).toContain('Product performance');
    expect(root.textContent).toContain('owner@shop.test');

    button(root, 'Send now')?.click();
    await settle(harness, 15);
    const mail = TestBed.inject(MockMailbox).list()[0];
    expect(mail.to).toBe('owner@shop.test');
    expect(mail.subject).toContain('Product performance');
  });
});
