import { ChangeDetectionStrategy, Component, PLATFORM_ID, RESPONSE_INIT, effect, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ContentApi } from '@ecom/shared/data-access';
import { NotFoundComponent } from '@ecom/shared/ui';

/**
 * Catch-all route. If staff set up a redirect for this address it answers with a permanent redirect
 * (a real 301 on the server, a client navigation in the browser); otherwise it shows the 404 page.
 */
@Component({
  selector: 'app-redirect-or-not-found',
  imports: [NotFoundComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (lookup.hasValue() && lookup.value() === null) {
      <ui-not-found />
    }
  `,
})
export class RedirectOrNotFoundComponent {
  private readonly router = inject(Router);
  private readonly response = inject(RESPONSE_INIT, { optional: true });
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly api = inject(ContentApi);
  private readonly path = this.router.url;

  protected readonly lookup = rxResource({ stream: () => this.api.redirectFor(this.path) });

  constructor() {
    effect(() => {
      if (!this.lookup.hasValue()) return;
      const target = this.lookup.value();
      if (!target) return;
      if (this.response) {
        this.response.status = 301;
        const headers = new Headers(this.response.headers as HeadersInit | undefined);
        headers.set('Location', target);
        this.response.headers = headers;
      }
      if (this.browser) {
        if (target.startsWith('/')) void this.router.navigateByUrl(target, { replaceUrl: true });
        else window.location.replace(target);
      }
    });
  }
}
