import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SeoService } from '@ecom/shared/core';
import type { AppNotification } from '@ecom/shared/models';
import { NotificationStore } from '@ecom/shared/state';
import { ButtonComponent, EmptyStateComponent } from '@ecom/shared/ui';

/** The notification centre: order, review and alert events, newest first. */
@Component({
  selector: 'app-notifications-page',
  imports: [DatePipe, ButtonComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold md:text-3xl">Notifications</h1>
      @if (store.unreadCount() > 0) {
        <button uiButton variant="secondary" size="sm" type="button" (click)="store.markAllRead()">Mark all as read</button>
      }
    </div>

    @if (!store.loaded()) {
      <p class="text-sm text-text-muted">Loading…</p>
    } @else if (store.notifications().length === 0) {
      <ui-empty-state title="No notifications yet" description="Order updates and the alerts you subscribe to will show up here." />
    } @else {
      <ul class="divide-y divide-border rounded-lg border border-border" aria-live="polite">
        @for (n of store.notifications(); track n.id) {
          <li>
            <button type="button" class="flex w-full min-h-11 items-start gap-3 p-4 text-left hover:bg-surface-alt" [class.bg-surface-alt]="!n.read" (click)="open(n)">
              @if (!n.read) {
                <span class="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true"></span>
              } @else {
                <span class="mt-2 size-2 shrink-0" aria-hidden="true"></span>
              }
              <span class="min-w-0 flex-1">
                <span class="block font-medium">{{ n.title }}@if (!n.read) { <span class="sr-only"> (unread)</span> }</span>
                <span class="block text-sm text-text-muted">{{ n.body }}</span>
                <span class="block text-xs text-text-muted">{{ n.createdAt | date: 'd MMM y, h:mm a' }}</span>
              </span>
            </button>
          </li>
        }
      </ul>
    }
  `,
})
export class NotificationsPageComponent {
  protected readonly store = inject(NotificationStore);
  private readonly router = inject(Router);

  constructor() {
    inject(SeoService).set({ title: 'Notifications', noindex: true, path: '/notifications' });
    // Refresh on every visit: the store's cache does not otherwise know about orders or alerts placed elsewhere.
    void this.store.refresh(true);
  }

  protected async open(n: AppNotification): Promise<void> {
    if (!n.read) await this.store.markRead(n.id);
    if (n.link) await this.router.navigateByUrl(n.link);
  }
}
