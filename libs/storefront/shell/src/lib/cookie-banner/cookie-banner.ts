import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConsentService } from '@ecom/shared/core';
import { ButtonComponent } from '@ecom/shared/ui';

@Component({
  selector: 'app-cookie-banner',
  imports: [RouterLink, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (consent.needsDecision()) {
      <section aria-label="Cookie preferences" class="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface p-4 shadow-modal">
        <div class="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p class="text-sm text-text">
            We use essential cookies to make the store work. With your consent we also use analytics cookies to improve it.
            <a routerLink="/pages/privacy" class="text-primary underline">Privacy policy</a>
          </p>
          <div class="flex gap-2">
            <button uiButton variant="secondary" type="button" (click)="consent.set('essential')">Essential only</button>
            <button uiButton type="button" (click)="consent.set('all')">Accept all</button>
          </div>
        </div>
      </section>
    }
  `,
})
export class CookieBannerComponent {
  protected readonly consent = inject(ConsentService);
}
