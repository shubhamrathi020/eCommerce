import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import axe from 'axe-core';
import { APP_CONFIG } from '@ecom/shared/core';
import { DEMO_ACCOUNTS, provideAdminDataAccess, provideDataAccess } from '@ecom/shared/data-access';
import { AuthStore } from '@ecom/shared/state';
import { adminRoutes } from '../admin.routes';

const config = { useMocks: true, mockLatencyMs: 0, apiBaseUrl: '', siteName: 'Shop Admin', siteUrl: 'http://x', features: {} };

async function settle(h: RouterTestingHarness, rounds = 12) {
  for (let i = 0; i < rounds; i++) {
    await h.fixture.whenStable();
    await new Promise((r) => setTimeout(r, 20));
    h.detectChanges();
  }
}

const button = (root: HTMLElement, text: string) => Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.trim().startsWith(text)) as HTMLButtonElement | undefined;
function fill(root: HTMLElement, selector: string, value: string) {
  const input = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (!input) throw new Error(`missing ${selector}`);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('admin recommendations', () => {
  it('shows the event data, validates rules, saves them, and previews the rows', async () => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter(adminRoutes, withComponentInputBinding()), { provide: APP_CONFIG, useValue: config }, provideDataAccess({ useMocks: true }), provideAdminDataAccess({ useMocks: true })],
    });
    const auth = TestBed.inject(AuthStore);
    await auth.init();
    await auth.login(DEMO_ACCOUNTS[1].email, DEMO_ACCOUNTS[1].password);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/recommendations');
    await settle(harness);
    let root = harness.routeNativeElement as HTMLElement;
    expect(root.textContent).toContain('Anonymous visitors');
    expect(root.textContent).toContain('Similar products');
    document.body.appendChild(root);
    const results = await axe.run(root, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 100)}`)).toEqual([]);

    // An unknown product id is refused beside the field.
    const areas = Array.from(root.querySelectorAll<HTMLTextAreaElement>('form textarea'));
    fill(root, `#${areas[0].id}`, 'p-nope');
    button(root, 'Save rules')?.click();
    await settle(harness, 15);
    expect(root.textContent).toContain('Unknown product id: p-nope');

    fill(root, `#${areas[0].id}`, 'p-0001');
    button(root, 'Save rules')?.click();
    await settle(harness, 15);
    root = harness.routeNativeElement as HTMLElement;
    expect(root.querySelectorAll('[role="alert"]').length).toBe(0);

    button(root, 'Preview rows')?.click();
    await settle(harness, 15);
    root = harness.routeNativeElement as HTMLElement;
    expect(root.textContent).toContain('Popular right now');
    expect(root.textContent).toContain('Trending this week');
    // The pinned product leads the trending row.
    const trending = root.querySelector('section[aria-label="Trending this week"] li');
    expect(trending?.textContent).toContain('(p-0001)');
  });
});
