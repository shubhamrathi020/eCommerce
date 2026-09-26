import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import axe from 'axe-core';
import { APP_CONFIG, WishlistStore } from '@ecom/shared/core';
import { DEMO_ACCOUNTS, provideDataAccess } from '@ecom/shared/data-access';
import { AuthStore } from '@ecom/shared/state';
import { accountRoutes } from './account.routes';

const config = { useMocks: true, mockLatencyMs: 0, apiBaseUrl: '', siteName: 'Shop', siteUrl: 'http://x', features: {} };
const demo = DEMO_ACCOUNTS[0];

async function settle(h: RouterTestingHarness, rounds = 10) {
  for (let i = 0; i < rounds; i++) {
    await h.fixture.whenStable();
    await new Promise((r) => setTimeout(r, 20));
    h.detectChanges();
  }
}

async function setup() {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideRouter([...accountRoutes, { path: '**', children: [] }], withComponentInputBinding()), { provide: APP_CONFIG, useValue: config }, provideDataAccess({ useMocks: true })],
  });
  const auth = TestBed.inject(AuthStore);
  await auth.init();
  return { harness: await RouterTestingHarness.create(), auth, router: TestBed.inject(Router) };
}

async function violations(root: HTMLElement): Promise<string[]> {
  document.body.appendChild(root);
  const r = await axe.run(root, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 100)}`);
}

function fill(el: HTMLElement, selector: string, value: string) {
  const input = el.querySelector<HTMLInputElement>(selector);
  if (!input) throw new Error(`missing ${selector}`);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
const button = (el: HTMLElement, text: string) => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim().startsWith(text)) as HTMLButtonElement | undefined;

describe('account pages', () => {
  it('protects account pages: redirects to sign in with a returnUrl, then returns after signing in', async () => {
    const { harness, router } = await setup();
    await harness.navigateByUrl('/account/addresses');
    expect(router.url).toBe('/account/login?returnUrl=%2Faccount%2Faddresses');
    await settle(harness);
    let el = harness.routeNativeElement as HTMLElement;
    expect(await violations(el)).toEqual([]);

    button(el, 'Sign in')?.click();
    await settle(harness);
    expect(el.querySelectorAll('[role="alert"]').length).toBeGreaterThan(0);

    fill(el, '[formcontrolname="email"]', demo.email);
    fill(el, '[formcontrolname="password"]', 'Wrong1234');
    button(el, 'Sign in')?.click();
    await settle(harness);
    expect(el.textContent).toContain('Incorrect email or password.');

    fill(el, '[formcontrolname="password"]', demo.password);
    button(el, 'Sign in')?.click();
    await settle(harness, 20);
    expect(router.url).toBe('/account/addresses');
    el = harness.routeNativeElement as HTMLElement;
    expect(el.textContent).toContain('Addresses');
  });

  it('ignores an external returnUrl (no open redirect)', async () => {
    const { harness, router } = await setup();
    await harness.navigateByUrl('/account/login?returnUrl=https%3A%2F%2Fevil.test');
    await settle(harness);
    const el = harness.routeNativeElement as HTMLElement;
    fill(el, '[formcontrolname="email"]', demo.email);
    fill(el, '[formcontrolname="password"]', demo.password);
    button(el, 'Sign in')?.click();
    await settle(harness, 20);
    expect(router.url).toBe('/account');
  });

  it('registers, shows validation, then lands signed in with an unverified-email reminder', async () => {
    const { harness, router, auth } = await setup();
    await harness.navigateByUrl('/account/register');
    await settle(harness);
    const el = harness.routeNativeElement as HTMLElement;
    button(el, 'Create account')?.click();
    await settle(harness);
    expect(el.querySelectorAll('[role="alert"]').length).toBeGreaterThan(1);
    fill(el, '[formcontrolname="name"]', 'Asha Rao');
    fill(el, '[formcontrolname="email"]', 'asha@example.com');
    fill(el, '[formcontrolname="password"]', 'weakpass1');
    button(el, 'Create account')?.click();
    await settle(harness, 15);
    expect(el.textContent).toContain('Use upper case, lower case and a number');
    fill(el, '[formcontrolname="password"]', 'Str0ngPass');
    button(el, 'Create account')?.click();
    await settle(harness, 20);
    expect(router.url).toBe('/account');
    expect(auth.loggedIn()).toBe(true);
    expect((harness.routeNativeElement as HTMLElement).textContent).toContain('Please verify your email');
  });

  it('forgot password always shows the same confirmation', async () => {
    const { harness } = await setup();
    await harness.navigateByUrl('/account/forgot-password');
    await settle(harness);
    const el = harness.routeNativeElement as HTMLElement;
    fill(el, '[formcontrolname="email"]', 'nobody@example.com');
    button(el, 'Send reset link')?.click();
    await settle(harness);
    expect(el.textContent).toContain('If an account exists');
    expect(await violations(el)).toEqual([]);
  });

  it('address book: add, make default, delete; profile update; privacy page', async () => {
    const { harness, auth } = await setup();
    await auth.login(demo.email, demo.password);
    await harness.navigateByUrl('/account/addresses');
    await settle(harness);
    let el = harness.routeNativeElement as HTMLElement;
    expect(el.textContent).toContain('No saved addresses');
    button(el, 'Add address')?.click();
    await settle(harness);
    for (const [name, value] of [['label', 'Home'], ['name', 'Asha Rao'], ['phone', '9876543210'], ['pincode', '560001'], ['line1', '12 MG Road'], ['city', 'Bengaluru'], ['state', 'Karnataka']]) fill(el, `[formcontrolname="${name}"]`, value);
    expect(await violations(el)).toEqual([]);
    button(el, 'Add address')?.click();
    await settle(harness, 15);
    expect(el.textContent).toContain('Default');
    expect(el.textContent).toContain('12 MG Road');
    button(el, 'Delete')?.click();
    await settle(harness, 15);
    expect(el.textContent).toContain('No saved addresses');

    await harness.navigateByUrl('/account/profile');
    await settle(harness);
    el = harness.routeNativeElement as HTMLElement;
    fill(el, '[formcontrolname="name"]', 'Renamed User');
    button(el, 'Save changes')?.click();
    await settle(harness, 15);
    expect(auth.user()?.name).toBe('Renamed User');
    expect(await violations(el)).toEqual([]);

    await harness.navigateByUrl('/account/privacy');
    await settle(harness);
    el = harness.routeNativeElement as HTMLElement;
    expect(el.textContent).toContain('Export my data');
    expect(await violations(el)).toEqual([]);
  }, 30000);

  it('wishlist page works for guests and can remove items', async () => {
    const { harness } = await setup();
    await harness.navigateByUrl('/wishlist');
    await settle(harness);
    let el = harness.routeNativeElement as HTMLElement;
    expect(el.textContent).toContain('Your wishlist is empty');
    TestBed.inject(WishlistStore).toggle('p-0001');
    TestBed.inject(WishlistStore).toggle('p-0002');
    await harness.navigateByUrl('/account/login');
    await harness.navigateByUrl('/wishlist');
    await settle(harness, 15);
    el = harness.routeNativeElement as HTMLElement;
    expect(el.querySelectorAll('ui-product-card')).toHaveLength(2);
    (el.querySelector('ui-product-card button[aria-pressed]') as HTMLButtonElement).click();
    await settle(harness);
    expect(el.querySelectorAll('ui-product-card')).toHaveLength(1);
  }, 20000);
});
