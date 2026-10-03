import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { I18nService } from '@ecom/shared/core';
import { MoneyPipe } from './money.pipe';

@Component({ selector: 'app-money-probe', imports: [MoneyPipe], template: `<span id="m">{{ amount() | money }}</span>` })
class ProbeComponent {
  amount = signal({ amount: 123456789, currency: 'INR' as const });
}

describe('money in the shop language (LX-02)', () => {
  it('follows the locale (grouping, digits) while the stored amount never changes', async () => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(ProbeComponent);
    await fixture.whenStable();
    const text = () => (fixture.nativeElement as HTMLElement).querySelector('#m')?.textContent as string;
    expect(text()).toBe('₹12,34,567.89');
    TestBed.inject(I18nService).set('hi');
    fixture.detectChanges();
    expect(text()).toBe('₹12,34,567.89');
    TestBed.inject(I18nService).set('rtl');
    fixture.detectChanges();
    expect(text()).toMatch(/[٠-٩]/);
    expect(fixture.componentInstance.amount().amount).toBe(123456789);
    fixture.componentInstance.amount.set({ amount: 50000, currency: 'INR' });
    fixture.detectChanges();
    expect(text()).toMatch(/^[^\d]*[٠-٩٬٫]+/);
  });
});
