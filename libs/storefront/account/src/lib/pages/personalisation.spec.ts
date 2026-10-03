import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import axe from 'axe-core';
import { APP_CONFIG, AnalyticsService, ConsentService, PersonalisationService } from '@ecom/shared/core';
import { MockEventStore, provideDataAccess } from '@ecom/shared/data-access';
import { accountRoutes } from '../account.routes';

const config = { useMocks: true, mockLatencyMs: 0, apiBaseUrl: '', siteName: 'Shop', siteUrl: 'http://x', features: {} };

async function settle(h: RouterTestingHarness, rounds = 8) {
  for (let i = 0; i < rounds; i++) {
    await h.fixture.whenStable();
    await new Promise((r) => setTimeout(r, 20));
    h.detectChanges();
  }
}

describe('personalisation page (RC-06)', () => {
  it('lets a guest see their activity, opt out, and clear their history', async () => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([...accountRoutes, { path: '**', children: [] }], withComponentInputBinding()), { provide: APP_CONFIG, useValue: config }, provideDataAccess({ useMocks: true })] });
    TestBed.inject(ConsentService).set('all');
    const analytics = TestBed.inject(AnalyticsService);
    analytics.track({ name: 'product_view', props: { productId: 'p-0001' } });
    analytics.track({ name: 'product_view', props: { productId: 'p-0002' } });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/personalisation');
    await settle(harness);
    let root = harness.routeNativeElement as HTMLElement;
    expect(root.textContent).toContain('2 event(s) recorded for this browser');
    document.body.appendChild(root);
    const results = await axe.run(root, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);

    const optOut = root.querySelector<HTMLInputElement>('input[type="checkbox"]') as HTMLInputElement;
    optOut.click();
    await settle(harness);
    expect(TestBed.inject(PersonalisationService).optedOut()).toBe(true);
    expect(root.textContent).toContain('Opted out');
    analytics.track({ name: 'product_view', props: { productId: 'p-0003' } });
    expect(TestBed.inject(MockEventStore).recorded()).toHaveLength(2); // nothing new was recorded

    const clear = Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Clear my history') as HTMLButtonElement;
    clear.click();
    await settle(harness, 12);
    root = harness.routeNativeElement as HTMLElement;
    expect(root.textContent).toContain('0 event(s) recorded');
    expect(TestBed.inject(MockEventStore).recorded()).toEqual([]);
  });
});
