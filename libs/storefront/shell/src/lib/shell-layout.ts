import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, PLATFORM_ID, effect, inject, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AttributionService, ConsentService } from '@ecom/shared/core';
import { ToastContainerComponent } from '@ecom/shared/ui';
import { CookieBannerComponent } from './cookie-banner/cookie-banner';
import { FooterComponent } from './footer/footer';
import { HeaderComponent } from './header/header';
import { MiniCartComponent } from './mini-cart/mini-cart';
import { OfflineBannerComponent } from './offline-banner/offline-banner';

@Component({
  selector: 'app-shell-layout',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, CookieBannerComponent, MiniCartComponent, OfflineBannerComponent, ToastContainerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-screen flex-col' },
  template: `
    <a href="#main" class="sr-only print:hidden z-50 rounded-md bg-primary px-4 py-2 text-primary-contrast focus:not-sr-only focus:fixed focus:left-2 focus:top-2">Skip to main content</a>
    <app-offline-banner />
    <app-header />
    <main #main id="main" tabindex="-1" class="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6"><router-outlet /></main>
    <app-footer />
    @defer (on idle) {
      <app-mini-cart />
    }
    <app-cookie-banner />
    <ui-toast-container />
  `,
})
export class ShellLayoutComponent {
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    // Screen-reader and keyboard users land on the new page's heading after every route change,
    // the same way a full page load would put focus at the top; a link click keeps its own focus.
    const router = inject(Router);
    const attribution = inject(AttributionService);
    const consent = inject(ConsentService);
    let params: Record<string, string | string[] | undefined> = {};
    router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => {
      queueMicrotask(() => this.focusHeading());
      // Campaign tags from the landing URL (utm_*) are remembered once the shopper has accepted analytics.
      params = router.parseUrl(e.urlAfterRedirects).queryParams;
      attribution.capture(params);
    });
    // Accepting analytics on the landing page still counts the campaign that brought the shopper there.
    effect(() => {
      if (consent.analyticsAllowed()) attribution.capture(params);
    });
  }

  private focusHeading(): void {
    const root = this.main().nativeElement;
    const heading = root.querySelector<HTMLElement>('h1');
    const target = heading ?? root;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
}
