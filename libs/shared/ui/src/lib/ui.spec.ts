import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ButtonComponent } from './button/button';
import { DrawerComponent } from './drawer/drawer';
import { PriceComponent } from './price/price';
import { QuantityStepperComponent } from './quantity-stepper/quantity-stepper';
import { RatingComponent } from './rating/rating';

@Component({
  imports: [ButtonComponent, PriceComponent, QuantityStepperComponent, RatingComponent, DrawerComponent],
  template: `
    <button uiButton [loading]="loading()">Go</button>
    <ui-price [price]="{ amount: 75000, currency: 'INR' }" [mrp]="{ amount: 100000, currency: 'INR' }" />
    <ui-quantity-stepper [(value)]="qty" [max]="3" />
    <ui-rating [value]="4.2" [count]="10" />
    <ui-drawer [(open)]="open" label="Menu">content</ui-drawer>
  `,
})
class HostComponent {
  loading = signal(false);
  qty = signal(1);
  open = signal(false);
}

describe('shared ui', () => {
  async function setup() {
    await TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('Button shows a busy state while loading', async () => {
    const { fixture, el } = await setup();
    fixture.componentInstance.loading.set(true);
    await fixture.whenStable();
    const btn = el.querySelector('button')!;
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect(btn.getAttribute('aria-disabled')).toBe('true');
  });

  it('Price shows the selling price, MRP and discount', async () => {
    const { el } = await setup();
    const text = el.querySelector('ui-price')!.textContent!;
    expect(text).toContain('₹750');
    expect(text).toContain('₹1,000');
    expect(text).toContain('25% off');
  });

  it('QuantityStepper respects min and max', async () => {
    const { fixture, el } = await setup();
    const [dec, inc] = Array.from(el.querySelectorAll<HTMLButtonElement>('ui-quantity-stepper button'));
    expect(dec.disabled).toBe(true);
    inc.click();
    inc.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.qty()).toBe(3);
    expect(inc.disabled).toBe(true);
  });

  it('Rating exposes an accessible label', async () => {
    const { el } = await setup();
    expect(el.querySelector('ui-rating')!.getAttribute('aria-label')).toBe('Rated 4.2 out of 5 from 10 reviews');
  });

  it('Drawer renders only when open', async () => {
    const { fixture, el } = await setup();
    expect(el.querySelector('[role="dialog"]')).toBeNull();
    fixture.componentInstance.open.set(true);
    await fixture.whenStable();
    expect(el.querySelector('[role="dialog"]')).not.toBeNull();
  });
});
