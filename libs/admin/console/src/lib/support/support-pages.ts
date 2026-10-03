import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LocaleDatePipe, SeoService, ToastService } from '@ecom/shared/core';
import { AdminSupportApi } from '@ecom/shared/data-access';
import { ApiException, TICKET_STATUS_LABEL, type TicketQuery, type TicketStatus } from '@ecom/contracts';
import { AuthStore } from '@ecom/shared/state';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, FormFieldComponent, InputDirective, NotFoundComponent, PaginationComponent, SkeletonComponent } from '@ecom/shared/ui';
import { injectListParams } from '../list-params';

const PAGE_SIZE = 20;
const STATUSES: TicketStatus[] = ['open', 'pending', 'closed'];
const tone = (s: TicketStatus) => (s === 'closed' ? 'neutral' : s === 'pending' ? 'primary' : 'warning');

/** Support queue (RF-06): filter by status and assignee, open one to reply. */
@Component({
  selector: 'adm-support-queue',
  imports: [LocaleDatePipe, RouterLink, BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, InputDirective, PaginationComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-3 text-2xl font-bold">Support</h1>
    <form class="mb-4 flex flex-wrap items-end gap-3" role="search" aria-label="Filter tickets" (submit)="search($event)">
      <div>
        <label for="sq" class="mb-1 block text-sm font-medium">Search</label>
        <input id="sq" uiInput type="search" placeholder="Ticket, subject, customer or order" [value]="q() ?? ''" (input)="draft.set($any($event.target).value)" />
      </div>
      <div>
        <label for="ss" class="mb-1 block text-sm font-medium">Status</label>
        <select id="ss" uiInput (change)="list.patch({ status: $any($event.target).value || null })">
          <option value="">All</option>
          @for (s of statuses; track s) {
            <option [value]="s" [selected]="status() === s">{{ labels[s] }}</option>
          }
        </select>
      </div>
      <div>
        <label for="sa" class="mb-1 block text-sm font-medium">Assignee</label>
        <select id="sa" uiInput (change)="list.patch({ assignee: $any($event.target).value || null })">
          <option value="">Anyone</option>
          <option value="me" [selected]="assignee() === 'me'">Assigned to me</option>
          <option value="none" [selected]="assignee() === 'none'">Unassigned</option>
        </select>
      </div>
      <button uiButton type="submit" variant="secondary">Search</button>
    </form>

    @if (resource.hasValue()) {
      @let data = resource.value();
      @if (data.items.length === 0) {
        <ui-empty-state title="No tickets" description="Customer questions appear here." />
      } @else {
        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full min-w-[44rem] text-start text-sm">
            <caption class="sr-only">Support tickets</caption>
            <thead class="bg-surface-alt">
              <tr>
                <th scope="col" class="p-2">Subject</th>
                <th scope="col" class="p-2">Customer</th>
                <th scope="col" class="p-2">Order</th>
                <th scope="col" class="p-2">Assignee</th>
                <th scope="col" class="p-2">Updated</th>
                <th scope="col" class="p-2">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              @for (t of data.items; track t.id) {
                <tr>
                  <td class="p-2"><a [routerLink]="['/support', t.id]" class="font-medium text-primary hover:underline">{{ t.subject }}</a><span class="block text-xs text-text-muted">{{ t.id }}</span></td>
                  <td class="p-2">{{ t.customerName }}</td>
                  <td class="p-2">{{ t.orderId ?? '' }}</td>
                  <td class="p-2">{{ t.assignee ?? 'Unassigned' }}</td>
                  <td class="whitespace-nowrap p-2 text-text-muted">{{ t.updatedAt | date: 'd MMM, h:mm a' }}</td>
                  <td class="p-2"><ui-badge [tone]="tone(t.status)">{{ labels[t.status] }}</ui-badge></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p class="mt-2 text-sm text-text-muted" aria-live="polite">{{ data.total }} tickets</p>
        <ui-pagination class="mt-4" [page]="data.page" [pageSize]="data.pageSize" [total]="data.total" />
      }
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-48" />
    }
  `,
})
export class SupportQueuePageComponent {
  private readonly api = inject(AdminSupportApi);
  protected readonly list = injectListParams();
  protected readonly statuses = STATUSES;
  protected readonly labels = TICKET_STATUS_LABEL;
  protected readonly tone = tone;

  protected readonly q = computed(() => this.list.str('q'));
  protected readonly status = computed(() => this.list.str('status') as TicketStatus | undefined);
  protected readonly assignee = computed(() => this.list.str('assignee') as 'me' | 'none' | undefined);
  protected readonly draft = signal('');
  private readonly query = computed<TicketQuery>(() => ({ q: this.q(), status: this.status(), assignee: this.assignee(), page: this.list.num('page', 1), pageSize: PAGE_SIZE }));
  protected readonly resource = rxResource({ params: () => this.query(), stream: ({ params }) => this.api.list(params) });

  constructor() {
    inject(SeoService).set({ title: 'Support', noindex: true });
    effect(() => {
      this.q();
      untracked(() => this.draft.set(this.q() ?? ''));
    });
  }

  protected search(event: Event): void {
    event.preventDefault();
    this.list.patch({ q: this.draft().trim() || null });
  }
}

/** One ticket: the conversation, a reply box, assignment and status. */
@Component({
  selector: 'adm-support-detail',
  imports: [LocaleDatePipe, RouterLink, BadgeComponent, ButtonComponent, ErrorStateComponent, FormFieldComponent, InputDirective, NotFoundComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (missing()) {
      <ui-not-found />
    } @else if (resource.hasValue()) {
      @let t = resource.value();
      <a routerLink="/support" class="mb-2 inline-flex min-h-11 items-center text-sm text-primary hover:underline">← Back to support</a>
      <div class="mb-1 flex flex-wrap items-center gap-3">
        <h1 class="text-2xl font-bold">{{ t.subject }}</h1>
        <ui-badge [tone]="tone(t.status)">{{ labels[t.status] }}</ui-badge>
      </div>
      <p class="mb-4 text-sm text-text-muted">{{ t.id }} · {{ t.customerName }} ({{ t.customerEmail }})@if (t.orderId) { · Order <a [routerLink]="['/orders', t.orderId]" class="text-primary underline">{{ t.orderId }}</a> } · Assigned to {{ t.assignee ?? 'nobody' }}</p>

      <div class="mb-4 flex flex-wrap gap-2" role="group" aria-label="Ticket actions">
        @if (t.assignee !== me()) {
          <button uiButton size="sm" variant="secondary" type="button" (click)="assign(t.id, me())">Assign to me</button>
        }
        @if (t.assignee) {
          <button uiButton size="sm" variant="ghost" type="button" (click)="assign(t.id, null)">Unassign</button>
        }
        @if (t.status === 'closed') {
          <button uiButton size="sm" variant="secondary" type="button" (click)="setStatus(t.id, 'open')">Reopen</button>
        } @else {
          <button uiButton size="sm" variant="secondary" type="button" (click)="setStatus(t.id, 'closed')">Close ticket</button>
        }
      </div>

      <ol class="mb-6 max-w-2xl space-y-3" aria-label="Messages">
        @for (m of t.messages; track m.id) {
          <li class="rounded-lg border p-3" [class]="m.author === 'staff' ? 'border-primary' : 'border-border'">
            <p class="mb-1 flex justify-between text-sm"><strong>{{ m.authorName }} <span class="font-normal text-text-muted">({{ m.author === 'staff' ? 'staff' : 'customer' }})</span></strong><time [attr.datetime]="m.at" class="text-text-muted">{{ m.at | date: 'd MMM y, h:mm a' }}</time></p>
            <p class="whitespace-pre-line">{{ m.body }}</p>
            @if (m.attachments.length) {
              <p class="mt-1 text-sm text-text-muted">Attached: {{ names(m.attachments) }}</p>
            }
          </li>
        }
      </ol>

      @if (t.status !== 'closed') {
        <form class="max-w-2xl space-y-3" (submit)="send($event, t.id)" novalidate>
          <ui-form-field #r="uiFormField" label="Reply to the customer" [error]="error()">
            <textarea uiInput rows="4" [id]="r.id" [value]="reply()" [attr.aria-describedby]="r.describedBy()" [attr.aria-invalid]="error() ? 'true' : null" (input)="reply.set($any($event.target).value)"></textarea>
          </ui-form-field>
          <button uiButton type="submit" [loading]="saving()">Send reply</button>
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
  private readonly api = inject(AdminSupportApi);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthStore);

  protected readonly resource = rxResource({ params: () => this.id(), stream: ({ params }) => this.api.get(params) });
  protected readonly missing = computed(() => {
    const e = this.resource.error();
    return this.resource.status() === 'error' && e instanceof ApiException && e.code === 'not_found';
  });
  protected readonly labels = TICKET_STATUS_LABEL;
  protected readonly tone = tone;
  protected readonly me = computed(() => this.auth.user()?.name ?? '');
  protected readonly reply = signal('');
  protected readonly error = signal('');
  protected readonly saving = signal(false);
  protected readonly names = (files: { name: string }[]) => files.map((f) => f.name).join(', ');

  constructor() {
    inject(SeoService).set({ title: 'Support ticket', noindex: true });
  }

  protected async send(event: Event, id: string): Promise<void> {
    event.preventDefault();
    this.error.set('');
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.reply(id, { message: this.reply() }));
      this.reply.set('');
      this.toast.success('Reply sent to the customer.');
      this.resource.reload();
    } catch (e) {
      this.error.set(e instanceof ApiException ? (e.fields?.['message'] ?? e.message) : 'Could not send the reply.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async assign(id: string, assignee: string | null): Promise<void> {
    await this.act(() => firstValueFrom(this.api.assign(id, assignee)));
  }

  protected async setStatus(id: string, status: TicketStatus): Promise<void> {
    await this.act(() => firstValueFrom(this.api.setStatus(id, status)));
  }

  private async act(action: () => Promise<unknown>): Promise<void> {
    try {
      await action();
      this.resource.reload();
    } catch (e) {
      this.toast.error(e instanceof ApiException ? e.message : 'That did not work. Please try again.');
    }
  }
}
