import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SeoService, ToastService } from '@ecom/shared/core';
import { AlertApi } from '@ecom/shared/data-access';
import type { AlertSubscription } from '@ecom/shared/models';
import { ButtonComponent, EmptyStateComponent, SkeletonComponent } from '@ecom/shared/ui';

const LABEL: Record<AlertSubscription['kind'], string> = { back_in_stock: 'Notify when back in stock', price_drop: 'Alert on price drop' };

/** The shopper's "notify me" and "alert me" subscriptions, with a way to remove each one. */
@Component({
  selector: 'app-alerts-page',
  imports: [NgOptimizedImage, RouterLink, ButtonComponent, EmptyStateComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-1 text-2xl font-bold md:text-3xl">Your alerts</h1>
    <p class="mb-4 text-sm text-text-muted">Products you asked to be told about. Manage which alerts you can subscribe to on the <a routerLink="/account/preferences" class="text-primary underline">preferences</a> page.</p>

    @if (resource.hasValue()) {
      @if (resource.value().length === 0) {
        <ui-empty-state title="No alerts yet" description="Look for “Notify me” or “Alert me on price drop” on a product page.">
          <a uiButton routerLink="/">Browse products</a>
        </ui-empty-state>
      } @else {
        <ul class="divide-y divide-border rounded-lg border border-border">
          @for (a of resource.value(); track a.id) {
            <li class="flex items-center gap-3 p-3">
              <a [routerLink]="['/p', a.slug]" class="shrink-0" tabindex="-1" aria-hidden="true"><img [ngSrc]="a.image.url" width="56" height="56" alt="" class="size-14 rounded-md object-cover" /></a>
              <span class="min-w-0 flex-1">
                <a [routerLink]="['/p', a.slug]" class="block truncate font-medium hover:text-primary">{{ a.title }}</a>
                <span class="block text-sm text-text-muted">{{ label(a) }}</span>
              </span>
              <button type="button" class="min-h-11 shrink-0 px-2 text-sm font-medium text-danger hover:underline" (click)="remove(a)">Remove</button>
            </li>
          }
        </ul>
      }
    } @else {
      <ui-skeleton class="h-48" />
    }
  `,
})
export class AlertsPageComponent {
  private readonly api = inject(AlertApi);
  private readonly toast = inject(ToastService);

  protected readonly resource = rxResource({ stream: () => this.api.list() });
  protected readonly label = (a: AlertSubscription) => LABEL[a.kind];

  constructor() {
    inject(SeoService).set({ title: 'Your alerts', noindex: true, path: '/account/alerts' });
  }

  protected async remove(a: AlertSubscription): Promise<void> {
    await firstValueFrom(this.api.remove(a.id));
    this.resource.reload();
    this.toast.info(`Removed the alert for "${a.title}"`);
  }
}
