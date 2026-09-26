import { ChangeDetectionStrategy, Component, RESPONSE_INIT, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '@ecom/shared/core';
import { ButtonComponent } from '../button/button';

@Component({
  selector: 'ui-not-found',
  imports: [RouterLink, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="py-16 text-center">
      <p class="text-6xl font-bold text-primary" aria-hidden="true">404</p>
      <h1 class="mt-2 text-2xl font-semibold">We could not find that page</h1>
      <p class="mt-2 text-text-muted">The link may be broken or the page may have moved.</p>
      <a uiButton routerLink="/" class="mt-6">Back to home</a>
    </section>
  `,
})
export class NotFoundComponent {
  constructor() {
    inject(SeoService).set({ title: 'Page not found', noindex: true });
    // On the server this makes the HTTP response a real 404 (matters for crawlers).
    const response = inject(RESPONSE_INIT, { optional: true });
    if (response) response.status = 404;
  }
}
