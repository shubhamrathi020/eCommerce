import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { APP_CONFIG, AttributionService, ConsentService } from '@ecom/shared/core';
import { provideDataAccess } from '@ecom/shared/data-access';
import { ShellLayoutComponent } from './shell-layout';

@Component({ selector: 'app-stub', template: `<h1>Landing</h1>` })
class StubComponent {}

function setup() {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ShellLayoutComponent],
    providers: [provideZonelessChangeDetection(), provideRouter([{ path: '**', component: StubComponent }]), { provide: APP_CONFIG, useValue: { useMocks: true, mockLatencyMs: 0, apiBaseUrl: '', siteName: 'Shop', siteUrl: 'http://x', features: {} } }, provideDataAccess({ useMocks: true })],
  });
}

describe('campaign attribution in the shell (AN-05)', () => {
  it('remembers the campaign in the landing URL once analytics are accepted, and not before', async () => {
    setup();
    const fixture = TestBed.createComponent(ShellLayoutComponent);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/?utm_source=Google&utm_medium=cpc&utm_campaign=festive-sale');
    await fixture.whenStable();
    fixture.detectChanges();
    const attribution = TestBed.inject(AttributionService);
    expect(attribution.touches()).toEqual({}); // no consent yet

    // Accepting analytics on the landing page still credits the campaign that brought the shopper.
    TestBed.inject(ConsentService).set('all');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(attribution.touches().first).toEqual({ source: 'google', medium: 'cpc', campaign: 'festive-sale' });

    await router.navigateByUrl('/c/mobiles?utm_source=newsletter');
    await fixture.whenStable();
    expect(attribution.touches()).toEqual({ first: { source: 'google', medium: 'cpc', campaign: 'festive-sale' }, last: { source: 'newsletter' } });
  });
});
