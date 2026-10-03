import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LocaleDatePipe, SeoService, ToastService } from '@ecom/shared/core';
import { OrderApi, SupportApi } from '@ecom/shared/data-access';
import { type AttachmentMeta, ApiException, TICKET_LIMITS, TICKET_STATUS_LABEL, type TicketStatus } from '@ecom/shared/models';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, FormFieldComponent, InputDirective, NotFoundComponent, SkeletonComponent } from '@ecom/shared/ui';
import { AttachmentPickerComponent } from './attachment-picker';

const tone = (s: TicketStatus) => (s === 'closed' ? 'neutral' : s === 'pending' ? 'warning' : 'primary');

/** The customer's support tickets (RF-06). They only ever see their own. */
@Component({
  selector: 'app-support-list-page',
  imports: [LocaleDatePipe, RouterLink, BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold md:text-3xl">Help and support</h1>
      <a uiButton routerLink="/account/support/new">Ask a question</a>
    </div>
    @if (resource.hasValue()) {
      @if (resource.value().length === 0) {
        <ui-empty-state title="No questions yet" description="Ask us about an order and our team will reply here."><a uiButton routerLink="/account/support/new">Ask a question</a></ui-empty-state>
      } @else {
        <ul class="divide-y divide-border rounded-lg border border-border">
          @for (t of resource.value(); track t.id) {
            <li class="flex flex-wrap items-center gap-3 p-4">
              <span class="min-w-0 flex-1">
                <a [routerLink]="['/account/support', t.id]" class="font-medium hover:text-primary">{{ t.subject }}</a>
                <span class="block text-sm text-text-muted">{{ t.id }}@if (t.orderId) { · Order {{ t.orderId }} } · updated {{ t.updatedAt | date: 'd MMM, h:mm a' }}</span>
              </span>
              <ui-badge [tone]="tone(t.status)">{{ labels[t.status] }}</ui-badge>
            </li>
          }
        </ul>
      }
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-48" />
    }
  `,
})
export class SupportListPageComponent {
  private readonly api = inject(SupportApi);
  protected readonly resource = rxResource({ stream: () => this.api.list() });
  protected readonly labels = TICKET_STATUS_LABEL;
  protected readonly tone = tone;

  constructor() {
    inject(SeoService).set({ title: 'Help and support', noindex: true, path: '/account/support' });
  }
}

/** New question, optionally about one of the customer's orders. */
@Component({
  selector: 'app-support-new-page',
  imports: [ButtonComponent, FormFieldComponent, InputDirective, AttachmentPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-4 text-2xl font-bold md:text-3xl">Ask a question</h1>
    <form (submit)="submit($event)" novalidate class="max-w-xl space-y-4">
      <ui-form-field #o="uiFormField" label="About which order?" hint="Optional" [error]="errors()['orderId'] ?? ''">
        <select uiInput [id]="o.id" [attr.aria-describedby]="o.describedBy()" (change)="setOrder($any($event.target).value)">
          <option value="">Not about a specific order</option>
          @for (order of orders.hasValue() ? orders.value() : []; track order.id) {
            <option [value]="order.id" [selected]="order.id === orderId()">{{ order.id }}</option>
          }
        </select>
      </ui-form-field>
      <ui-form-field #s="uiFormField" label="Subject" [required]="true" [error]="errors()['subject'] ?? ''">
        <input uiInput [id]="s.id" [attr.maxlength]="limits.subject" [attr.aria-describedby]="s.describedBy()" [attr.aria-invalid]="errors()['subject'] ? 'true' : null" (input)="subject.set($any($event.target).value)" />
      </ui-form-field>
      <ui-form-field #m="uiFormField" label="Your message" [required]="true" [hint]="message().length + ' / ' + limits.message" [error]="errors()['message'] ?? ''">
        <textarea uiInput rows="5" [id]="m.id" [attr.aria-describedby]="m.describedBy()" [attr.aria-invalid]="errors()['message'] ? 'true' : null" (input)="message.set($any($event.target).value)"></textarea>
      </ui-form-field>
      <div>
        <app-attachment-picker (changed)="attachments.set($event)" />
        @if (errors()['attachments']) {
          <p class="mt-1 text-sm text-danger" role="alert">{{ errors()['attachments'] }}</p>
        }
      </div>
      @if (formError()) {
        <p class="text-sm text-danger" role="alert">{{ formError() }}</p>
      }
      <button uiButton type="submit" [loading]="saving()">Send</button>
    </form>
  `,
})
export class SupportNewPageComponent {
  /** `?order=` pre-selects the order. */
  readonly order = input<string | undefined>();

  private readonly api = inject(SupportApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly limits = TICKET_LIMITS;
  private readonly orderApi = inject(OrderApi);
  protected readonly orders = rxResource({ stream: () => this.orderApi.list() });
  protected readonly orderId = computed(() => this.chosen() ?? this.order() ?? '');
  private readonly chosen = signal<string | undefined>(undefined);
  protected readonly setOrder = (value: string) => this.chosen.set(value);
  protected readonly subject = signal('');
  protected readonly message = signal('');
  protected readonly attachments = signal<AttachmentMeta[]>([]);
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly formError = signal('');
  protected readonly saving = signal(false);

  constructor() {
    inject(SeoService).set({ title: 'Ask a question', noindex: true, path: '/account/support/new' });
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.errors.set({});
    this.formError.set('');
    const local: Record<string, string> = {};
    if (!this.subject().trim()) local['subject'] = 'Add a short subject';
    if (!this.message().trim()) local['message'] = 'Write your message';
    if (Object.keys(local).length) {
      this.errors.set(local);
      return;
    }
    this.saving.set(true);
    try {
      const ticket = await firstValueFrom(this.api.create({ subject: this.subject(), message: this.message(), ...(this.orderId() ? { orderId: this.orderId() } : {}), attachments: this.attachments() }));
      this.toast.success('Thanks, we have your question.');
      await this.router.navigate(['/account/support', ticket.id]);
    } catch (e) {
      if (e instanceof ApiException) {
        this.errors.set(e.fields ?? {});
        this.formError.set(e.fields ? '' : e.message);
      } else this.formError.set('Could not send your question. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }
}

/** One conversation: timestamped messages, a reply box, and a close button. */
@Component({
  selector: 'app-support-detail-page',
  imports: [LocaleDatePipe, RouterLink, BadgeComponent, ButtonComponent, ErrorStateComponent, FormFieldComponent, InputDirective, NotFoundComponent, SkeletonComponent, AttachmentPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (notFound()) {
      <ui-not-found />
    } @else if (resource.hasValue()) {
      @let t = resource.value();
      <h1 class="mb-1 text-2xl font-bold md:text-3xl">{{ t.subject }}</h1>
      <p class="mb-4 text-sm text-text-muted">{{ t.id }}@if (t.orderId) { · Order <a [routerLink]="['/orders', t.orderId]" class="text-primary underline">{{ t.orderId }}</a> } · <ui-badge [tone]="tone(t.status)">{{ labels[t.status] }}</ui-badge></p>

      <ol class="mb-6 max-w-2xl space-y-3" aria-label="Messages">
        @for (m of t.messages; track m.id) {
          <li class="rounded-lg border p-3" [class]="m.author === 'staff' ? 'border-primary' : 'border-border'">
            <p class="mb-1 flex justify-between text-sm"><strong>{{ m.author === 'staff' ? m.authorName + ' (support)' : 'You' }}</strong><time [attr.datetime]="m.at" class="text-text-muted">{{ m.at | date: 'd MMM y, h:mm a' }}</time></p>
            <p class="whitespace-pre-line">{{ m.body }}</p>
            @if (m.attachments.length) {
              <p class="mt-1 text-sm text-text-muted">Attached: {{ names(m.attachments) }}</p>
            }
          </li>
        }
      </ol>

      @if (t.status === 'closed') {
        <p class="text-sm text-text-muted" role="status">This question is closed. <a routerLink="/account/support/new" class="text-primary underline">Ask a new one</a> if you still need help.</p>
      } @else {
        <form (submit)="send($event)" novalidate class="max-w-2xl space-y-4">
          <ui-form-field #r="uiFormField" label="Reply" [error]="error()">
            <textarea uiInput rows="4" [id]="r.id" [value]="reply()" [attr.aria-describedby]="r.describedBy()" [attr.aria-invalid]="error() ? 'true' : null" (input)="reply.set($any($event.target).value)"></textarea>
          </ui-form-field>
          <app-attachment-picker (changed)="attachments.set($event)" />
          <div class="flex flex-wrap gap-2">
            <button uiButton type="submit" [loading]="saving()">Send reply</button>
            <button uiButton variant="ghost" type="button" (click)="close()">Close this question</button>
          </div>
        </form>
      }
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-64 max-w-2xl" />
    }
  `,
})
export class SupportDetailPageComponent {
  readonly id = input.required<string>();
  private readonly api = inject(SupportApi);
  private readonly toast = inject(ToastService);

  protected readonly resource = rxResource({ params: () => this.id(), stream: ({ params }) => this.api.get(params) });
  protected readonly notFound = computed(() => {
    const e = this.resource.error();
    return this.resource.status() === 'error' && e instanceof ApiException && e.code === 'not_found';
  });
  protected readonly labels = TICKET_STATUS_LABEL;
  protected readonly tone = tone;
  protected readonly reply = signal('');
  protected readonly attachments = signal<AttachmentMeta[]>([]);
  protected readonly error = signal('');
  protected readonly saving = signal(false);
  protected readonly names = (files: AttachmentMeta[]) => files.map((f) => f.name).join(', ');

  constructor() {
    inject(SeoService).set({ title: 'Support question', noindex: true, path: '/account/support' });
  }

  protected async send(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set('');
    if (!this.reply().trim()) {
      this.error.set('Write a message first');
      return;
    }
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.reply(this.id(), { message: this.reply(), attachments: this.attachments() }));
      this.reply.set('');
      this.resource.reload();
    } catch (e) {
      this.error.set(e instanceof ApiException ? (e.fields?.['message'] ?? e.fields?.['attachments'] ?? e.message) : 'Could not send your reply.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async close(): Promise<void> {
    try {
      await firstValueFrom(this.api.close(this.id()));
      this.toast.info('Question closed.');
      this.resource.reload();
    } catch (e) {
      this.toast.error(e instanceof ApiException ? e.message : 'Could not close this question.');
    }
  }
}
