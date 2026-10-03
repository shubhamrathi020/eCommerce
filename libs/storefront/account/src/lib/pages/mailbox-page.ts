import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleDatePipe, SeoService } from '@ecom/shared/core';
import { MockMailbox, type MockMail } from '@ecom/shared/data-access';
import { ButtonComponent, EmptyStateComponent } from '@ecom/shared/ui';

/** Development-only inbox for the emails the mock backend would send (verification, reset, order confirmations). */
@Component({
  selector: 'app-mailbox-page',
  imports: [LocaleDatePipe, RouterLink, ButtonComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-1 text-2xl font-bold md:text-3xl">Demo mailbox</h1>
    <p class="mb-4 text-sm text-text-muted">Development only. No real email is sent; messages the shop would send appear here.</p>
    @if (mails().length === 0) {
      <ui-empty-state title="No emails yet" description="Register, request a password reset or place an order to see messages." />
    } @else {
      <button uiButton variant="secondary" type="button" class="mb-4" (click)="clear()">Clear mailbox</button>
      <ul class="space-y-3">
        @for (m of mails(); track m.id) {
          <li class="rounded-lg border border-border p-4">
            <p class="text-sm text-text-muted">To {{ m.to }} · {{ m.sentAt | date: 'd MMM, h:mm a' }}</p>
            <p class="font-semibold">{{ m.subject }}</p>
            <p class="text-sm">{{ m.body }}</p>
            @if (m.link) {
              <a [href]="m.link" class="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-primary underline">Open link</a>
            }
          </li>
        }
      </ul>
    }
    <a routerLink="/" class="mt-6 inline-flex min-h-11 items-center text-sm text-primary hover:underline">Back to the shop</a>
  `,
})
export class MailboxPageComponent {
  private readonly mailbox = inject(MockMailbox);
  protected readonly mails = signal<MockMail[]>(this.mailbox.list());

  constructor() {
    inject(SeoService).set({ title: 'Demo mailbox', noindex: true });
  }

  protected clear(): void {
    this.mailbox.clear();
    this.mails.set([]);
  }
}
