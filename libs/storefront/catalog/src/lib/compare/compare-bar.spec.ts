import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BottomBarService, CompareStore, ConsentService } from '@ecom/shared/core';
import { CompareBarComponent } from './compare-bar';

/** The bar stacks with the cookie banner and, on mobile, with a page's own sticky action bar. */
describe('CompareBarComponent', () => {
  async function render() {
    TestBed.configureTestingModule({ imports: [CompareBarComponent], providers: [provideZonelessChangeDetection(), provideRouter([])] });
    const fixture = TestBed.createComponent(CompareBarComponent);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement, compare: TestBed.inject(CompareStore), consent: TestBed.inject(ConsentService), bottomBar: TestBed.inject(BottomBarService) };
  }

  it('is hidden with nothing to compare, and until the cookie banner has a decision', async () => {
    const { fixture, el, compare, consent } = await render();
    expect(el.querySelector('[role="region"]')).toBeNull();

    compare.add('p1');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.querySelector('[role="region"]')).toBeNull(); // consent still undecided

    consent.set('essential');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.querySelector('[role="region"]')).not.toBeNull();
  });

  it('gets out of the way on mobile while a page reports its own sticky action bar, but not by default', async () => {
    const { fixture, el, compare, consent, bottomBar } = await render();
    compare.add('p1');
    consent.set('all');
    fixture.detectChanges();
    await fixture.whenStable();
    const bar = el.querySelector('[role="region"]') as HTMLElement;
    expect(bar.className).not.toContain('max-md:hidden');

    bottomBar.setPrimaryActionVisible(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(bar.className).toContain('max-md:hidden');

    bottomBar.setPrimaryActionVisible(false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(bar.className).not.toContain('max-md:hidden');
  });
});
