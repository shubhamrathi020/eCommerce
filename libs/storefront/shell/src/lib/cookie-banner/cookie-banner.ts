import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConsentService, TranslatePipe } from '@ecom/shared/core';
import { ButtonComponent } from '@ecom/shared/ui';

@Component({
  selector: 'app-cookie-banner',
  imports: [RouterLink, ButtonComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (consent.needsDecision()) {
      <section [attr.aria-label]="'cookie.label' | t" class="print:hidden fixed inset-x-0 bottom-0 z-[15] border-t border-border bg-surface p-4 shadow-modal">
        <div class="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p class="text-sm text-text">
            {{ 'cookie.text' | t }}
            <a routerLink="/pages/privacy" class="text-primary underline">{{ 'cookie.privacy' | t }}</a>
          </p>
          <div class="flex gap-2">
            <button uiButton variant="secondary" type="button" (click)="consent.set('essential')">{{ 'cookie.essential' | t }}</button>
            <button uiButton type="button" (click)="consent.set('all')">{{ 'cookie.all' | t }}</button>
          </div>
        </div>
      </section>
    }
  `,
})
export class CookieBannerComponent {
  protected readonly consent = inject(ConsentService);
}
