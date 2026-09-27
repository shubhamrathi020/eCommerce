import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NetworkStatusService } from '@ecom/shared/core';
import { OfflineBannerComponent } from './offline-banner';

describe('OfflineBannerComponent', () => {
  it('shows only while offline, and reacts to the browser going online again', async () => {
    TestBed.configureTestingModule({ imports: [OfflineBannerComponent], providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(OfflineBannerComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="status"]')).toBeNull();

    window.dispatchEvent(new Event('offline'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.textContent).toContain("You're offline");

    window.dispatchEvent(new Event('online'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.querySelector('[role="status"]')).toBeNull();

    TestBed.inject(NetworkStatusService).ngOnDestroy();
  });
});
