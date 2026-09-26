import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from '@ecom/shared/ui';
import { CookieBannerComponent } from './cookie-banner/cookie-banner';
import { FooterComponent } from './footer/footer';
import { HeaderComponent } from './header/header';

@Component({
  selector: 'app-shell-layout',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, CookieBannerComponent, ToastContainerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-screen flex-col' },
  template: `
    <a href="#main" class="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-contrast focus:not-sr-only focus:fixed focus:left-2 focus:top-2">Skip to main content</a>
    <app-header />
    <main id="main" tabindex="-1" class="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6"><router-outlet /></main>
    <app-footer />
    <app-cookie-banner />
    <ui-toast-container />
  `,
})
export class ShellLayoutComponent {}
