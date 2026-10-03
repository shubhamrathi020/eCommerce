import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { ConsentService, PersonalisationService, SeoService, ToastService } from '@ecom/shared/core';
import { RecommendationApi } from '@ecom/shared/data-access';
import { ButtonComponent } from '@ecom/shared/ui';

/** Public page: what we record to personalise the shop, and the controls to stop it or wipe it (BRD 15, RC-06). */
@Component({
  selector: 'app-personalisation-page',
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-1 text-2xl font-bold md:text-3xl">Personalisation and privacy</h1>
    <p class="mb-6 max-w-2xl text-sm text-text-muted">Rows such as “Recommended for you” and “Trending” are built from simple, anonymous activity: which products you viewed, added to your cart or bought. Nothing recorded contains your name, email or account. It stays on this device in the demo shop.</p>

    <div class="max-w-xl space-y-4">
      <section class="rounded-lg border border-border p-4" aria-labelledby="consent-h">
        <h2 id="consent-h" class="font-semibold">Analytics</h2>
        @if (consent.analyticsAllowed()) {
          <p class="text-sm text-text-muted">You accepted analytics, so browsing activity is recorded unless you opt out below.</p>
          <button uiButton variant="secondary" size="sm" class="mt-2" type="button" (click)="withdrawConsent()">Stop recording (essential only)</button>
        } @else {
          <p class="text-sm text-text-muted">Nothing is being recorded, because you have not accepted analytics. Recommendations still work, using what is popular with everyone.</p>
          <button uiButton variant="secondary" size="sm" class="mt-2" type="button" (click)="consent.set('all')">Allow analytics</button>
        }
      </section>

      <section class="rounded-lg border border-border p-4" aria-labelledby="optout-h">
        <h2 id="optout-h" class="font-semibold">Personalised recommendations</h2>
        <label class="mt-1 flex min-h-11 items-start gap-3 text-sm">
          <input type="checkbox" class="mt-0.5 size-5 shrink-0 accent-primary" [checked]="personalisation.optedOut()" (change)="optOut($any($event.target).checked)" />
          <span><strong>Opt out.</strong> Stop recording my activity and show me popular items instead of items picked for me.</span>
        </label>
        <p aria-live="polite" class="mt-1 text-sm text-success">{{ message() }}</p>
      </section>

      <section class="rounded-lg border border-border p-4" aria-labelledby="history-h">
        <h2 id="history-h" class="font-semibold">My activity</h2>
        <p class="text-sm text-text-muted">{{ count.hasValue() ? count.value() : 0 }} event(s) recorded for this browser.</p>
        <button uiButton variant="danger" size="sm" class="mt-2" type="button" [disabled]="!count.hasValue() || count.value() === 0" [loading]="clearing()" (click)="clear()">Clear my history</button>
        <p class="mt-1 text-xs text-text-muted">This deletes the activity recorded for this browser and gives it a new anonymous identity.</p>
      </section>
    </div>
  `,
})
export class PersonalisationPageComponent {
  protected readonly consent = inject(ConsentService);
  protected readonly personalisation = inject(PersonalisationService);
  private readonly api = inject(RecommendationApi);
  private readonly toast = inject(ToastService);

  protected readonly count = rxResource({ stream: () => this.api.historyCount() });
  protected readonly message = signal('');
  protected readonly clearing = signal(false);

  constructor() {
    inject(SeoService).set({ title: 'Personalisation and privacy', noindex: true, path: '/personalisation' });
  }

  protected optOut(value: boolean): void {
    this.personalisation.setOptOut(value);
    this.message.set(value ? 'Opted out. Your activity is no longer recorded and recommendations are not personalised.' : 'Personalisation is on again.');
  }

  protected withdrawConsent(): void {
    this.consent.set('essential');
    this.message.set('Analytics are off. Nothing further will be recorded.');
  }

  protected async clear(): Promise<void> {
    this.clearing.set(true);
    try {
      await firstValueFrom(this.api.clearHistory());
      this.toast.success('Your activity history was cleared.');
      this.count.reload();
    } finally {
      this.clearing.set(false);
    }
  }
}
