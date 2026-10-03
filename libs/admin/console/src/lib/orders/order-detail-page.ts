import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom, type Observable } from 'rxjs';
import { LocaleDatePipe, SeoService, ToastService } from '@ecom/shared/core';
import { AdminOrderApi } from '@ecom/shared/data-access';
import type { AdminOrderDetail, OrderStatus } from '@ecom/contracts';
import { ApiException } from '@ecom/contracts';
import { BadgeComponent, ButtonComponent, CartLineComponent, ErrorStateComponent, FormFieldComponent, InputDirective, NotFoundComponent, OrderSummaryComponent, SkeletonComponent } from '@ecom/shared/ui';
import { statusTone } from './orders-page';

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = { packed: 'Mark as packed', shipped: 'Mark as shipped', delivered: 'Mark as delivered', cancelled: 'Cancel order' };

@Component({
  selector: 'adm-order-detail',
  imports: [LocaleDatePipe, ReactiveFormsModule, RouterLink, BadgeComponent, ButtonComponent, CartLineComponent, ErrorStateComponent, FormFieldComponent, InputDirective, NotFoundComponent, OrderSummaryComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (missing()) {
      <ui-not-found />
    } @else if (order(); as o) {
      <a routerLink="/orders" class="mb-2 inline-flex min-h-11 items-center text-sm text-primary hover:underline">← Back to orders</a>
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <h1 class="text-2xl font-bold">{{ o.id }}</h1>
        <ui-badge [tone]="tone(o.status)">{{ o.status.replace('_', ' ') }}</ui-badge>
        <span class="text-sm text-text-muted">{{ o.createdAt | date: 'd MMM y, h:mm a' }}</span>
      </div>

      @if (o.allowedNext.length) {
        <section class="mb-6 flex flex-wrap items-center gap-2 rounded-lg bg-surface-alt p-3" aria-label="Order actions">
          @for (next of o.allowedNext; track next) {
            @if (next === 'cancelled') {
              @if (!confirmCancel()) {
                <button uiButton variant="danger" size="sm" type="button" (click)="confirmCancel.set(true)">{{ actionLabel(next) }}</button>
              } @else {
                <button uiButton variant="danger" size="sm" type="button" [loading]="busy()" (click)="advance(next)">Confirm cancellation</button>
                <button uiButton variant="ghost" size="sm" type="button" (click)="confirmCancel.set(false)">Keep order</button>
              }
            } @else {
              <button uiButton size="sm" type="button" [loading]="busy()" (click)="advance(next)">{{ actionLabel(next) }}</button>
            }
          }
        </section>
      }

      <div class="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div class="space-y-6">
          <section aria-labelledby="tl">
            <h2 id="tl" class="mb-3 text-lg font-semibold">Timeline</h2>
            <ol class="space-y-2 border-s-2 border-border ps-4 text-sm">
              @for (t of o.timeline; track $index) {
                <li><span class="font-medium">{{ t.label }}</span> <span class="text-text-muted">{{ t.at ? (t.at | date: 'd MMM, h:mm a') : 'Pending' }}</span></li>
              }
            </ol>
          </section>
          <section aria-labelledby="it">
            <h2 id="it" class="mb-3 text-lg font-semibold">Items</h2>
            <ul class="divide-y divide-border rounded-lg border border-border px-4">
              @for (line of o.lines; track line.variantId) {
                <li class="py-3"><ui-cart-line [line]="line" [compact]="true" [editable]="false" /></li>
              }
            </ul>
          </section>
          <section aria-labelledby="nt">
            <h2 id="nt" class="mb-3 text-lg font-semibold">Internal notes</h2>
            <form (submit)="addNote($event)" class="mb-3 flex items-end gap-2" novalidate>
              <ui-form-field #f="uiFormField" label="Add a note" class="flex-1" [error]="noteError()">
                <input uiInput [id]="f.id" [formControl]="note" maxlength="500" [attr.aria-describedby]="f.describedBy()" [attr.aria-invalid]="noteError() ? 'true' : null" />
              </ui-form-field>
              <button uiButton type="submit" variant="secondary">Add note</button>
            </form>
            <ul class="space-y-2 text-sm">
              @for (n of o.notes; track n.id) {
                <li class="rounded-md border border-border p-2"><p>{{ n.text }}</p><p class="text-xs text-text-muted">{{ n.author }} · {{ n.at | date: 'd MMM, h:mm a' }}</p></li>
              }
            </ul>
          </section>
        </div>
        <aside class="space-y-4">
          <section class="rounded-lg border border-border p-4"><h2 class="mb-2 font-semibold">Totals</h2><ui-order-summary [totals]="o.totals" [coupon]="undefined" [promotions]="o.promotions" />@if (o.couponCode) { <p class="mt-2 text-sm text-text-muted">Coupon {{ o.couponCode }}</p> }</section>
          <section class="rounded-lg border border-border p-4 text-sm"><h2 class="mb-1 font-semibold">Payment</h2><p>{{ o.paymentMethod === 'cod' ? 'Cash on delivery' : 'Online (Razorpay)' }}</p><p class="text-text-muted">{{ o.paymentStatus.replace('_', ' ') }}</p></section>
          <section class="rounded-lg border border-border p-4 text-sm"><h2 class="mb-1 font-semibold">Customer</h2><p>{{ o.contact.name }}</p><p class="text-text-muted">{{ o.contact.email }} · {{ o.contact.phone }}</p><p class="mt-1 text-text-muted">{{ o.address.line1 }}, {{ o.address.city }}, {{ o.address.state }} {{ o.address.pincode }}</p></section>
        </aside>
      </div>
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-48" />
    }
  `,
})
export class OrderDetailPageComponent {
  readonly id = input.required<string>();
  private readonly api = inject(AdminOrderApi);
  private readonly toast = inject(ToastService);

  protected readonly resource = rxResource({ params: () => this.id(), stream: ({ params }) => this.api.get(params) });
  private readonly latest = signal<AdminOrderDetail | null>(null);
  protected readonly order = computed<AdminOrderDetail | undefined>(() => {
    const fresh = this.latest();
    if (fresh?.id === this.id()) return fresh;
    return this.resource.hasValue() ? this.resource.value() : undefined;
  });
  protected readonly missing = computed(() => this.resource.status() === 'error' && this.resource.error() instanceof ApiException && (this.resource.error() as ApiException).code === 'not_found');

  protected readonly busy = signal(false);
  protected readonly confirmCancel = signal(false);
  protected readonly note = new FormControl('', { nonNullable: true });
  protected readonly noteError = signal('');
  protected tone = statusTone;

  constructor() {
    inject(SeoService).set({ title: 'Order', noindex: true });
  }

  protected actionLabel(s: OrderStatus): string {
    return ACTION_LABEL[s] ?? s;
  }

  private async apply(request: Observable<AdminOrderDetail>): Promise<boolean> {
    try {
      this.latest.set(await firstValueFrom(request));
      return true;
    } catch (e) {
      if (e instanceof ApiException && e.fields?.['text']) this.noteError.set(e.fields['text']);
      else this.toast.error(e instanceof ApiException ? e.message : 'The action failed.');
      return false;
    }
  }

  protected async advance(status: OrderStatus): Promise<void> {
    this.busy.set(true);
    if (await this.apply(this.api.advance(this.id(), status))) this.toast.success(status === 'cancelled' ? 'Order cancelled' : 'Order updated');
    this.confirmCancel.set(false);
    this.busy.set(false);
  }

  protected async addNote(event: Event): Promise<void> {
    event.preventDefault();
    this.noteError.set('');
    if (await this.apply(this.api.addNote(this.id(), this.note.value))) this.note.reset();
  }
}
