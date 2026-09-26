import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import axe from 'axe-core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '@ecom/shared/core';
import { CartApi, CatalogApi, DEMO_ACCOUNTS, OrderApi, provideDataAccess } from '@ecom/shared/data-access';
import { AuthStore } from '@ecom/shared/state';
import { catalogRoutes } from './catalog.routes';

const config = { useMocks: true, mockLatencyMs: 0, apiBaseUrl: '', siteName: 'Shop', siteUrl: 'http://x', features: {} };
const demo = DEMO_ACCOUNTS[0];

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

async function setup() {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideRouter(catalogRoutes, withComponentInputBinding()), { provide: APP_CONFIG, useValue: config }, provideDataAccess({ useMocks: true })],
  });
  const auth = TestBed.inject(AuthStore);
  await auth.init();
  const catalog = TestBed.inject(CatalogApi);
  const list = await firstValueFrom(catalog.listing({ filters: {}, sort: 'featured', page: 1, pageSize: 60 }));
  const product = (await firstValueFrom(catalog.productsByIds(list.items.map((i) => i.id)))).find((p) => p.variants.some((v) => v.stock > 5));
  if (!product) throw new Error('no product');
  return { harness: await RouterTestingHarness.create(), auth, product };
}

async function buy(productId: string) {
  const product = (await firstValueFrom(TestBed.inject(CatalogApi).productsByIds([productId])))[0];
  await firstValueFrom(TestBed.inject(CartApi).add((product.variants.find((v) => v.stock > 5) ?? product.variants[0]).id, 1));
  await firstValueFrom(TestBed.inject(OrderApi).place({ idempotencyKey: `k${Math.random()}`, contact: { name: demo.name, email: demo.email, phone: '9876543210' }, address: { line1: '1 Road', city: 'Pune', state: 'MH', pincode: '411001' }, paymentMethod: 'cod' }));
}

const button = (root: HTMLElement, text: string) => Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.trim().startsWith(text)) as HTMLButtonElement | undefined;
function fill(root: HTMLElement, selector: string, value: string) {
  const input = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (!input) throw new Error(`missing ${selector}`);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
async function openReviews(harness: RouterTestingHarness, slug: string) {
  await harness.navigateByUrl(`/p/${slug}`);
  await settle(harness, 15);
  const root = harness.routeNativeElement as HTMLElement;
  Array.from(root.querySelectorAll<HTMLElement>('[role="tab"]')).find((t) => t.textContent?.includes('Reviews'))?.click();
  await settle(harness, 15);
  return root;
}

describe('writing and voting on reviews', () => {
  it('tells visitors why they cannot review: signed out, then not a buyer', async () => {
    const { harness, auth, product } = await setup();
    let root = await openReviews(harness, product.slug);
    expect(root.textContent).toContain('to review products you have bought');
    expect(root.querySelector('app-review-form')).toBeNull();

    await auth.login(demo.email, demo.password);
    root = await openReviews(harness, product.slug);
    expect(root.textContent).toContain('Only customers who bought this product can review it.');
  });

  it('a buyer writes a review with validation, sees it live, and can edit and delete it', async () => {
    const { harness, auth, product } = await setup();
    await auth.login(demo.email, demo.password);
    await buy(product.id);
    const root = await openReviews(harness, product.slug);
    const before = product.rating.count;

    button(root, 'Write a review')?.click();
    await settle(harness);
    expect(await violations(root)).toEqual([]);
    button(root, 'Submit review')?.click();
    await settle(harness, 15);
    expect(root.textContent).toContain('Choose a rating from 1 to 5 stars');
    expect(root.textContent).toContain('This field is required');
    fill(root, '[formcontrolname="body"]', 'too short');
    button(root, 'Submit review')?.click();
    await settle(harness, 10);
    expect(root.textContent).toContain('Write at least 10 characters');

    // stars work with the keyboard: arrow right selects the next star
    const stars = root.querySelectorAll<HTMLElement>('ui-rating-input [role="radio"]');
    stars[0].click();
    stars[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await settle(harness);
    expect(root.querySelectorAll('ui-rating-input [role="radio"][aria-checked="true"]')).toHaveLength(1);
    expect(root.querySelector('ui-rating-input [role="radio"][aria-checked="true"]')?.getAttribute('aria-label')).toBe('2 stars');
    root.querySelectorAll<HTMLElement>('ui-rating-input [role="radio"]')[4].click();
    fill(root, '[formcontrolname="title"]', 'Really good');
    fill(root, '[formcontrolname="body"]', 'Solid quality and quick delivery, happy with it.');
    button(root, 'Submit review')?.click();
    await settle(harness, 20);

    expect(root.textContent).toContain('Your review is now live');
    expect(root.textContent).toContain('Your review');
    expect(root.textContent).toContain('Verified purchase');
    const heading = root.querySelector('h3:not(#write-h)');
    expect(heading).not.toBeNull();
    expect(root.textContent).toContain(String(before + 1));

    button(root, 'Edit')?.click();
    await settle(harness, 10);
    expect((root.querySelector('[formcontrolname="title"]') as HTMLInputElement).value).toBe('Really good');
    fill(root, '[formcontrolname="body"]', 'Actually, see www.spam.example for a better one.');
    button(root, 'Save review')?.click();
    await settle(harness, 20);
    expect(root.textContent).toContain('waiting for moderation');

    button(root, 'Delete')?.click();
    await settle(harness, 20);
    expect(root.textContent).toContain('Your review was deleted.');
    expect(await violations(root)).toEqual([]);
  }, 40000);

  it('helpful votes need sign in, toggle for buyers of other reviews, and update the count', async () => {
    const { harness, auth, product } = await setup();
    let root = await openReviews(harness, product.slug);
    const firstVote = () => root.querySelector<HTMLButtonElement>('app-reviews-section button[aria-pressed]');
    if (!firstVote()) return; // product without reviews: nothing to vote on
    firstVote()?.click();
    await settle(harness);
    expect(firstVote()?.getAttribute('aria-pressed')).toBe('false'); // signed out: no vote recorded

    await auth.login(demo.email, demo.password);
    root = await openReviews(harness, product.slug);
    const button0 = firstVote();
    const count = Number(button0?.textContent?.match(/\((\d+)\)/)?.[1]);
    button0?.click();
    await settle(harness, 15);
    expect(firstVote()?.getAttribute('aria-pressed')).toBe('true');
    expect(Number(firstVote()?.textContent?.match(/\((\d+)\)/)?.[1])).toBe(count + 1);
    firstVote()?.click();
    await settle(harness, 15);
    expect(firstVote()?.getAttribute('aria-pressed')).toBe('false');
  }, 40000);
});
