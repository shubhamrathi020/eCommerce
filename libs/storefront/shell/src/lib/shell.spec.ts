import { TestBed } from '@angular/core/testing';
import axe from 'axe-core';
import { provideRouter } from '@angular/router';
import { APP_CONFIG } from '@ecom/shared/core';
import { provideDataAccess } from '@ecom/shared/data-access';
import { ShellLayoutComponent } from './shell-layout';

describe('ShellLayoutComponent', () => {
  it('renders header, main landmark, footer and category navigation', async () => {
    await TestBed.configureTestingModule({
      imports: [ShellLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: APP_CONFIG, useValue: { useMocks: true, mockLatencyMs: 0, apiBaseUrl: '', siteName: 'Shop', siteUrl: 'http://x', features: {} } },
        provideDataAccess({ useMocks: true }),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ShellLayoutComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('main#main')).not.toBeNull();
    expect(el.querySelector('app-header')).not.toBeNull();
    expect(el.querySelector('app-footer')).not.toBeNull();
    expect(el.querySelector('a[href="#main"]')?.textContent).toContain('Skip to main content');
    expect(el.querySelectorAll('nav[aria-label="Categories"] button').length).toBeGreaterThanOrEqual(8);
    expect(el.querySelector('app-cookie-banner section')).not.toBeNull();
  });

  it('has no serious accessibility violations (structure, names, ARIA)', async () => {
    await TestBed.configureTestingModule({
      imports: [ShellLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: APP_CONFIG, useValue: { useMocks: true, mockLatencyMs: 0, apiBaseUrl: '', siteName: 'Shop', siteUrl: 'http://x', features: {} } },
        provideDataAccess({ useMocks: true }),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ShellLayoutComponent);
    await fixture.whenStable();
    document.body.appendChild(fixture.nativeElement);
    // jsdom cannot compute colours, so contrast is checked manually in the browser.
    const results = await axe.run(fixture.nativeElement, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
  });
});
