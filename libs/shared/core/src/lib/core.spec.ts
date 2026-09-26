import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { APP_CONFIG, STORAGE } from './tokens';
import { ConsentService } from './consent.service';
import { FeatureFlagService } from './feature-flag.service';
import { SeoService } from './seo.service';
import { ToastService } from './toast.service';

const config = { useMocks: true, apiBaseUrl: '/api', siteName: 'Shop', siteUrl: 'http://localhost:4200', features: { beta: true } };

describe('core services', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [{ provide: APP_CONFIG, useValue: config }] });
  });

  it('ToastService adds and dismisses toasts', () => {
    const toast = TestBed.inject(ToastService);
    toast.show('info', 'hello', 0);
    expect(toast.toasts()).toHaveLength(1);
    toast.dismiss(toast.toasts()[0].id);
    expect(toast.toasts()).toHaveLength(0);
  });

  it('ConsentService starts undecided and persists the choice', () => {
    const consent = TestBed.inject(ConsentService);
    expect(consent.needsDecision()).toBe(true);
    expect(consent.analyticsAllowed()).toBe(false);
    consent.set('all');
    expect(consent.analyticsAllowed()).toBe(true);
    expect(TestBed.inject(STORAGE).getItem('ecom.consent.v1')).toBe('all');
  });

  it('ConsentService ignores garbage in storage', () => {
    localStorage.setItem('ecom.consent.v1', 'banana');
    expect(TestBed.inject(ConsentService).needsDecision()).toBe(true);
  });

  it('FeatureFlagService reads flags from config', () => {
    const flags = TestBed.inject(FeatureFlagService);
    expect(flags.isEnabled('beta')).toBe(true);
    expect(flags.isEnabled('missing')).toBe(false);
  });

  it('SeoService sets title, description, canonical and safe JSON-LD', () => {
    const seo = TestBed.inject(SeoService);
    seo.set({ title: 'Home', description: 'Desc', path: '/p/a', jsonLd: { name: '</script><b>' } });
    expect(TestBed.inject(Title).getTitle()).toBe('Home | Shop');
    expect(TestBed.inject(Meta).getTag('name="description"')?.content).toBe('Desc');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('http://localhost:4200/p/a');
    expect(document.getElementById('seo-jsonld')?.textContent).not.toContain('</script>');
  });
});
