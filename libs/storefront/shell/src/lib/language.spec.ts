import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import axe from 'axe-core';
import { APP_CONFIG, I18nService, ThemeService } from '@ecom/shared/core';
import { provideDataAccess } from '@ecom/shared/data-access';
import { ShellLayoutComponent } from './shell-layout';

async function render() {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ShellLayoutComponent],
    providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: APP_CONFIG, useValue: { useMocks: true, mockLatencyMs: 0, apiBaseUrl: '', siteName: 'Shop', siteUrl: 'http://x', features: {} } }, provideDataAccess({ useMocks: true })],
  });
  const fixture = TestBed.createComponent(ShellLayoutComponent);
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, i18n: TestBed.inject(I18nService) };
}

async function violations(root: HTMLElement): Promise<string[]> {
  document.body.appendChild(root);
  const r = await axe.run(root, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 110)}`);
}

describe('language and theme in the shell (BRD 18)', () => {
  it('switches every covered string to Hindi at once, with no English left on those surfaces', async () => {
    const { fixture, el, i18n } = await render();
    expect(el.querySelector('app-cookie-banner section')?.getAttribute('aria-label')).toBe('Cookie preferences');
    expect(el.querySelector('app-footer')?.textContent).toContain('Newsletter');

    i18n.set('hi');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(document.documentElement.lang).toBe('hi');
    const banner = el.querySelector('app-cookie-banner') as HTMLElement;
    expect(banner.querySelector('section')?.getAttribute('aria-label')).toBe('कुकी प्राथमिकताएँ');
    expect(banner.textContent).toContain('सभी स्वीकार करें');
    expect(banner.textContent).toContain('गोपनीयता नीति');
    expect(banner.textContent).not.toContain('Accept all');

    const footer = el.querySelector('app-footer') as HTMLElement;
    expect(footer.textContent).toContain('न्यूज़लेटर');
    expect(footer.textContent).toContain('सदस्यता लें');
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()}`);
    expect(footer.textContent).not.toContain('Subscribe');

    const header = el.querySelector('app-header') as HTMLElement;
    expect(header.querySelector('a[href="/cart"]')?.getAttribute('aria-label')).toBe('कार्ट, 0 वस्तु');
    expect(header.querySelector('a[href="/wishlist"]')?.getAttribute('aria-label')).toBe('विशलिस्ट');
    expect(header.querySelector('input[type="search"]')?.getAttribute('placeholder')).toBe('उत्पाद, ब्रांड और बहुत कुछ खोजें');
    expect(header.querySelector('nav[aria-label="खाता और कार्ट"]')).not.toBeNull();

    i18n.set('en');
    fixture.detectChanges();
    expect(banner.textContent).toContain('Accept all');
    expect(document.documentElement.lang).toBe('en');
  });

  it('offers a language menu in the footer that works, labels Hindi a draft, and explains it', async () => {
    const { fixture, el, i18n } = await render();
    const select = el.querySelector<HTMLSelectElement>('ui-language-picker select') as HTMLSelectElement;
    const labels = Array.from(select.options).map((o) => o.textContent?.trim());
    expect(labels).toContain('English');
    expect(labels).toContain('हिन्दी (draft translation)');
    expect(el.querySelector('ui-language-picker')?.textContent).not.toContain('not reviewed');

    select.value = 'hi';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    expect(i18n.locale()).toBe('hi');
    expect(el.querySelector('ui-language-picker')?.textContent).toContain('प्रारंभिक');
    expect(el.querySelector('ui-language-picker select option[value="hi"]')?.textContent).toContain('प्रारंभिक अनुवाद');
  });

  it('flips the page direction for the right-to-left test language and back', async () => {
    const { fixture, i18n } = await render();
    i18n.set('rtl');
    fixture.detectChanges();
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
    i18n.set('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('keeps the shell accessible in Hindi and in the right-to-left test language', async () => {
    const { fixture, el, i18n } = await render();
    for (const code of ['hi', 'rtl'] as const) {
      i18n.set(code);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(await violations(el)).toEqual([]);
    }
  });

  it('switches between light, dark and the device setting, and remembers it', async () => {
    const { fixture, el } = await render();
    const theme = TestBed.inject(ThemeService);
    const select = el.querySelector<HTMLSelectElement>('ui-theme-toggle select') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.textContent?.trim())).toEqual(['Match my device', 'Light', 'Dark']);
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);

    select.value = 'dark';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(theme.effective()).toBe('dark');
    expect(localStorage.getItem('ecom.theme.v1')).toBe('dark');

    select.value = 'light';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    select.value = 'system';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(await violations(el)).toEqual([]);
  });
});
