import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { APP_CONFIG } from '@ecom/shared/core';
import { MockContentStore, provideDataAccess } from '@ecom/shared/data-access';
import { ShellLayoutComponent } from './shell-layout';
import { RedirectOrNotFoundComponent } from './redirect-or-not-found';
import { StaticPageComponent } from './static-page/static-page';

const config = { useMocks: true, mockLatencyMs: 0, apiBaseUrl: '', siteName: 'Shop', siteUrl: 'http://x', features: {} };

async function open(url: string, prepare?: (store: MockContentStore) => void) {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([{ path: '', component: ShellLayoutComponent, children: [{ path: 'pages/:slug', component: StaticPageComponent }, { path: '**', component: RedirectOrNotFoundComponent }] }], withComponentInputBinding()),
      { provide: APP_CONFIG, useValue: config },
      provideDataAccess({ useMocks: true }),
    ],
  });
  prepare?.(TestBed.inject(MockContentStore));
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  for (let i = 0; i < 15; i++) {
    await harness.fixture.whenStable();
    await new Promise((r) => setTimeout(r, 20));
    harness.detectChanges();
  }
  return { harness, router: TestBed.inject(Router), el: harness.fixture.nativeElement as HTMLElement };
}

const page = (over: Record<string, unknown>) => ({ slug: 'shipping', title: 'Shipping', source: 'Hi', body: '<p>Hi <b>there</b></p>', status: 'published' as const, updatedAt: '2026-09-01T00:00:00Z', locked: false, ...over });

describe('content on the storefront', () => {
  it('footer shows the managed links, internal and external', async () => {
    const { el } = await open('/pages/about', (store) => store.setLinks([{ id: '1', label: 'Shipping info', href: '/pages/shipping', group: 'help', order: 1 }, { id: '2', label: 'Our blog', href: 'https://blog.example.com', group: 'about', order: 1 }]));
    const footer = el.querySelector('app-footer') as HTMLElement;
    expect(footer.textContent).toContain('Shipping info');
    expect(footer.querySelector('a[href="/pages/shipping"]')).not.toBeNull();
    const external = footer.querySelector('a[href="https://blog.example.com"]');
    expect(external?.getAttribute('rel')).toContain('noopener');
    expect(footer.textContent).not.toContain('Privacy policy');
  });

  it('published pages render, drafts are a 404 for shoppers', async () => {
    const published = await open('/pages/shipping', (store) => store.savePage(page({})));
    expect(published.el.textContent).toContain('there');
    const draft = await open('/pages/shipping', (store) => store.savePage(page({ status: 'draft' })));
    expect(draft.el.textContent).toContain('We could not find that page');
    const preview = await open('/pages/shipping?preview=1', (store) => store.savePage(page({ status: 'draft' })));
    expect(preview.el.textContent).toContain('We could not find that page'); // not signed in as staff
  });

  it('managed redirects send visitors to the new address; unknown addresses show the 404 page', async () => {
    const moved = await open('/old-shoes', (store) => store.setRedirects([{ id: 'r', from: '/old-shoes', to: '/pages/about', createdAt: '2026-09-01T00:00:00Z' }]));
    expect(moved.router.url).toBe('/pages/about');
    const missing = await open('/nothing-here');
    expect(missing.router.url).toBe('/nothing-here');
    expect(missing.el.textContent).toContain('We could not find that page');
  });
});
