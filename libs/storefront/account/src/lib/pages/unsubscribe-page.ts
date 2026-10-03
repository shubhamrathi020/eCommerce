import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SeoService } from '@ecom/shared/core';
import { PreferenceApi } from '@ecom/shared/data-access';
import { ApiException } from '@ecom/contracts';
import { ButtonComponent } from '@ecom/shared/ui';

/** Reached from an email link; works without signing in. Turns off one preference channel. */
@Component({
  selector: 'app-unsubscribe-page',
  imports: [RouterLink, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-md text-center">
      @switch (status()) {
        @case ('done') {
          <h1 class="mb-2 text-2xl font-bold">You're unsubscribed</h1>
          <p class="text-text-muted">You will no longer receive {{ label() }}. You can turn this back on any time.</p>
        }
        @case ('error') {
          <h1 class="mb-2 text-2xl font-bold">That link didn't work</h1>
          <p class="text-text-muted">{{ error() }}</p>
        }
        @default {
          <p class="text-text-muted">Working on it…</p>
        }
      }
      <a uiButton routerLink="/account/preferences" class="mt-6 inline-flex">Manage all preferences</a>
    </div>
  `,
})
export class UnsubscribePageComponent {
  private readonly api = inject(PreferenceApi);
  protected readonly status = signal<'working' | 'done' | 'error'>('working');
  protected readonly label = signal('');
  protected readonly error = signal('');

  constructor() {
    inject(SeoService).set({ title: 'Unsubscribe', noindex: true, path: '/unsubscribe' });
    const token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');
    if (!token) {
      this.status.set('error');
      this.error.set('This link is missing its token.');
      return;
    }
    void this.run(token);
  }

  private async run(token: string): Promise<void> {
    try {
      const { label } = await firstValueFrom(this.api.unsubscribe(token));
      this.label.set(label);
      this.status.set('done');
    } catch (e) {
      this.error.set(e instanceof ApiException ? e.message : 'This link is invalid or has expired.');
      this.status.set('error');
    }
  }
}
