import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { SeoService, ToastService } from '@ecom/shared/core';
import { PreferenceApi } from '@ecom/shared/data-access';
import { ApiException, type NotificationPreferences } from '@ecom/shared/models';
import { SkeletonComponent } from '@ecom/shared/ui';

/** Order, security and payment messages are always on and are not shown as a toggle here. */
@Component({
  selector: 'app-preferences-page',
  imports: [SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-1 text-2xl font-bold md:text-3xl">Notification preferences</h1>
    <p class="mb-6 max-w-xl text-sm text-text-muted">Order, payment and account messages always reach you. Everything else is your choice.</p>

    @if (prefs(); as p) {
      <div class="max-w-xl space-y-4">
        <div class="flex items-start justify-between gap-4 rounded-lg border border-border p-4 opacity-70">
          <div>
            <p class="font-medium">Order updates</p>
            <p class="text-sm text-text-muted">Placed, paid, packed, shipped, delivered and cancelled.</p>
          </div>
          <span class="mt-1 shrink-0 rounded-full bg-surface-alt px-2 py-1 text-xs font-medium">Always on</span>
        </div>

        <label class="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border p-4">
          <span>
            <span class="block font-medium">Marketing emails</span>
            <span class="block text-sm text-text-muted">Sales, new arrivals and offers.@if (p.marketingConsentAt) { <span class="block text-xs">Consent given {{ consentDate() }}</span> }</span>
          </span>
          <input type="checkbox" class="mt-1 size-5 shrink-0 accent-primary" [checked]="p.marketing" (change)="toggle('marketing', $any($event.target).checked)" />
        </label>

        <label class="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border p-4">
          <span>
            <span class="block font-medium">Back-in-stock alerts</span>
            <span class="block text-sm text-text-muted">Lets you use "Notify me" on out-of-stock products.</span>
          </span>
          <input type="checkbox" class="mt-1 size-5 shrink-0 accent-primary" [checked]="p.backInStockAlerts" (change)="toggle('backInStockAlerts', $any($event.target).checked)" />
        </label>

        <label class="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border p-4">
          <span>
            <span class="block font-medium">Price-drop alerts</span>
            <span class="block text-sm text-text-muted">Lets you use "Alert me on price drop" on product pages.</span>
          </span>
          <input type="checkbox" class="mt-1 size-5 shrink-0 accent-primary" [checked]="p.priceDropAlerts" (change)="toggle('priceDropAlerts', $any($event.target).checked)" />
        </label>

        @if (p.marketing) {
          <div class="text-sm text-text-muted">
            <p>Every marketing email ends with this one-click unsubscribe link.</p>
            @if (unsubLink()) {
              <a [href]="unsubLink()" class="break-all text-primary underline">{{ unsubLink() }}</a>
            } @else {
              <button type="button" class="text-primary underline" (click)="loadLink()">Show my unsubscribe link</button>
            }
          </div>
        }
        <p aria-live="polite" class="text-sm text-success">{{ savedMessage() }}</p>
      </div>
    } @else {
      <ui-skeleton class="h-64 max-w-xl" />
    }
  `,
})
export class PreferencesPageComponent {
  private readonly api = inject(PreferenceApi);
  private readonly toast = inject(ToastService);

  protected readonly resource = rxResource({ stream: () => this.api.get() });
  protected readonly savedMessage = signal('');
  protected readonly unsubLink = signal('');
  private readonly local = signal<NotificationPreferences | null>(null);
  protected readonly prefs = (): NotificationPreferences | undefined => this.local() ?? (this.resource.hasValue() ? this.resource.value() : undefined);
  protected readonly consentDate = () => {
    const at = this.prefs()?.marketingConsentAt;
    return at ? new Date(at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  };

  constructor() {
    inject(SeoService).set({ title: 'Notification preferences', noindex: true, path: '/account/preferences' });
    effect(() => {
      if (!this.resource.hasValue()) return;
      const value = this.resource.value();
      untracked(() => this.local.set(value));
    });
  }

  protected async loadLink(): Promise<void> {
    try {
      this.unsubLink.set(await firstValueFrom(this.api.unsubscribeLink('marketing')));
    } catch {
      this.toast.error('Could not load your unsubscribe link.');
    }
  }

  protected async toggle(key: keyof NotificationPreferences, checked: boolean): Promise<void> {
    const current = this.prefs();
    if (!current) return;
    const next: NotificationPreferences = { ...current, [key]: checked } as NotificationPreferences;
    this.local.set(next);
    try {
      this.local.set(await firstValueFrom(this.api.save(next)));
      this.savedMessage.set('Saved');
      setTimeout(() => this.savedMessage.set(''), 2000);
    } catch (e) {
      this.local.set(current);
      this.toast.error(e instanceof ApiException ? e.message : 'Could not save your preferences.');
    }
  }
}
