import { DatePipe, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SeoService, ToastService } from '@ecom/shared/core';
import { AdminReturnApi } from '@ecom/shared/data-access';
import { ApiException, type Disposition, reasonOf } from '@ecom/shared/models';
import { MoneyPipe } from '@ecom/shared/util';
import { BadgeComponent, ButtonComponent, ErrorStateComponent, FormFieldComponent, InputDirective, NotFoundComponent, SkeletonComponent } from '@ecom/shared/ui';
import { RETURN_STATUS_LABEL, returnTone } from './return-labels';

const today = () => new Date().toISOString().slice(0, 10);

/** One return: what the customer asked for, the refund the API computed, and the next action for staff (RF-02, RF-03, RF-05). */
@Component({
  selector: 'adm-return-detail',
  imports: [DatePipe, NgOptimizedImage, RouterLink, MoneyPipe, BadgeComponent, ButtonComponent, ErrorStateComponent, FormFieldComponent, InputDirective, NotFoundComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (missing()) {
      <ui-not-found />
    } @else if (resource.hasValue()) {
      @let r = resource.value();
      <a routerLink="/returns/queue" class="mb-2 inline-flex min-h-11 items-center text-sm text-primary hover:underline">← Back to returns</a>
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <h2 class="text-2xl font-bold">{{ r.id }}</h2>
        <ui-badge [tone]="tone(r.status)">{{ labels[r.status] }}</ui-badge>
        <span class="text-sm text-text-muted">Order <a [routerLink]="['/orders', r.orderId]" class="text-primary underline">{{ r.orderId }}</a> · {{ r.customerName }} ({{ r.customerEmail }})</span>
      </div>

      @if (error()) {
        <p class="mb-4 rounded-lg border border-danger p-3 text-sm" role="alert">{{ error() }}</p>
      }

      <div class="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div class="space-y-6">
          <section aria-labelledby="next">
            <h3 id="next" class="mb-3 text-lg font-semibold">Next step</h3>
            @switch (r.status) {
              @case ('requested') {
                <div class="space-y-4 rounded-lg border border-border p-4">
                  <p class="text-sm text-text-muted">Check the refund on the right, then approve with a pickup date or reject with a reason the customer will see.</p>
                  <div class="grid gap-3 sm:grid-cols-2">
                    <ui-form-field #pd="uiFormField" label="Pickup date" [required]="true" [error]="fields()['pickupDate'] ?? ''">
                      <input uiInput type="date" [id]="pd.id" [min]="minDate" [value]="pickupDate()" [attr.aria-describedby]="pd.describedBy()" (input)="pickupDate.set($any($event.target).value)" />
                    </ui-form-field>
                    <ui-form-field #pn="uiFormField" label="Note for the courier" [error]="fields()['note'] ?? ''">
                      <input uiInput [id]="pn.id" [attr.aria-describedby]="pn.describedBy()" (input)="pickupNote.set($any($event.target).value)" />
                    </ui-form-field>
                  </div>
                  <button uiButton type="button" [loading]="busy()" (click)="approve(r.id)">Approve and schedule pickup</button>
                  <hr class="border-border" />
                  <ui-form-field #rj="uiFormField" label="Reason for rejecting" [error]="fields()['reason'] ?? ''">
                    <textarea uiInput rows="2" [id]="rj.id" [attr.aria-describedby]="rj.describedBy()" (input)="rejectReason.set($any($event.target).value)"></textarea>
                  </ui-form-field>
                  <button uiButton variant="danger" type="button" [loading]="busy()" (click)="reject(r.id)">Reject request</button>
                </div>
              }
              @case ('approved') {
                <div class="rounded-lg border border-border p-4">
                  <p class="mb-3 text-sm">Pickup scheduled for <strong>{{ r.pickup?.date | date: 'd MMM y' }}</strong>.@if (r.pickup?.note) { <span class="text-text-muted"> {{ r.pickup?.note }}</span> }</p>
                  <button uiButton type="button" [loading]="busy()" (click)="pickedUp(r.id)">Mark as picked up</button>
                </div>
              }
              @case ('picked_up') {
                <form class="space-y-4 rounded-lg border border-border p-4" (submit)="check($event, r.id)">
                  <p class="text-sm text-text-muted">Inspect the items. If they pass, decide for each whether it goes back on sale or is scrapped; this writes the stock ledger.</p>
                  <fieldset class="space-y-2">
                    <legend class="mb-1 text-sm font-medium">Condition of each item</legend>
                    @for (i of r.items; track i.variantId) {
                      <div class="flex flex-wrap items-center justify-between gap-2">
                        <span class="text-sm">{{ i.quantity }} × {{ i.title }}</span>
                        <label class="text-sm">
                          <span class="sr-only">Decision for {{ i.title }}</span>
                          <select uiInput class="!w-44" (change)="setDisposition(i.variantId, $any($event.target).value)">
                            <option value="">Choose…</option>
                            <option value="restock">Restock (sellable)</option>
                            <option value="scrap">Scrap (not sellable)</option>
                          </select>
                        </label>
                      </div>
                    }
                    @if (fields()['dispositions']) {
                      <p class="text-sm text-danger" role="alert">{{ fields()['dispositions'] }}</p>
                    }
                  </fieldset>
                  <ui-form-field #cn="uiFormField" label="Inspection note" [required]="true" [error]="fields()['note'] ?? ''">
                    <textarea uiInput rows="2" [id]="cn.id" [attr.aria-describedby]="cn.describedBy()" (input)="checkNote.set($any($event.target).value)"></textarea>
                  </ui-form-field>
                  <div class="flex flex-wrap gap-2">
                    <button uiButton type="submit" [loading]="busy()">Passed: record check</button>
                    <button uiButton variant="danger" type="button" [loading]="busy()" (click)="failCheck(r.id)">Failed: reject the return</button>
                  </div>
                </form>
              }
              @case ('checked') {
                <div class="rounded-lg border border-border p-4">
                  <p class="mb-3 text-sm">The check passed. Refund <strong>{{ r.refund.total | money }}</strong> {{ r.refund.method === 'original' ? 'to the original payment method' : 'as store credit' }}.</p>
                  <button uiButton type="button" [loading]="busy()" (click)="refund(r.id)">Issue refund</button>
                </div>
              }
              @case ('refunded') {
                <p class="rounded-lg border border-success p-4 text-sm" role="status">Refunded {{ r.refundedAt | date: 'd MMM y, h:mm a' }}.</p>
              }
              @default {
                <p class="rounded-lg border border-border p-4 text-sm" role="status">Rejected: {{ r.rejectionReason }}</p>
              }
            }
          </section>

          <section aria-labelledby="items">
            <h3 id="items" class="mb-3 text-lg font-semibold">Items</h3>
            <ul class="divide-y divide-border rounded-lg border border-border">
              @for (i of r.items; track i.variantId) {
                <li class="flex items-center gap-3 p-3">
                  <img [ngSrc]="i.image.url" width="48" height="48" alt="" class="size-12 rounded-md object-cover" />
                  <span class="min-w-0 flex-1 text-sm"><span class="block truncate font-medium">{{ i.title }}</span>{{ i.quantity }} × {{ i.unitPrice | money }}</span>
                  @if (i.disposition) {
                    <ui-badge [tone]="i.disposition === 'restock' ? 'success' : 'warning'">{{ i.disposition === 'restock' ? 'Restocked' : 'Scrapped' }}</ui-badge>
                  }
                </li>
              }
            </ul>
            <p class="mt-2 text-sm text-text-muted">Reason: {{ reasonLabel(r.reason) }}@if (r.comments) { · “{{ r.comments }}” }</p>
            @if (r.attachments.length) {
              <p class="text-sm text-text-muted">Attachments: {{ names(r) }}</p>
            }
            @if (r.check) {
              <p class="text-sm text-text-muted">Check: {{ r.check.result }} by {{ r.check.by }}. “{{ r.check.note }}”</p>
            }
          </section>

          <section aria-labelledby="tl">
            <h3 id="tl" class="mb-3 text-lg font-semibold">Timeline</h3>
            <ol class="space-y-2 border-l-2 border-border pl-4 text-sm">
              @for (t of r.timeline; track $index) {
                <li><span class="font-medium">{{ t.label }}</span> <span class="text-text-muted">{{ t.at | date: 'd MMM, h:mm a' }}</span>@if (t.note) { <span class="block text-text-muted">{{ t.note }}</span> }</li>
              }
            </ol>
          </section>
        </div>

        <aside class="rounded-lg border border-border p-4" aria-labelledby="rf">
          <h3 id="rf" class="mb-2 font-semibold">Refund (computed)</h3>
          <dl class="space-y-1 text-sm">
            <div class="flex justify-between"><dt>Items</dt><dd>{{ r.refund.items | money }}</dd></div>
            <div class="flex justify-between"><dt>Coupon discount share</dt><dd>− {{ r.refund.discountShare | money }}</dd></div>
            <div class="flex justify-between"><dt>Shipping refunded</dt><dd>{{ r.refund.shippingRefund | money }}</dd></div>
            <div class="flex justify-between"><dt>Return shipping fee</dt><dd>− {{ r.refund.returnFee | money }}</dd></div>
            <div class="flex justify-between border-t border-border pt-2 text-base font-semibold"><dt>Total</dt><dd>{{ r.refund.total | money }}</dd></div>
          </dl>
          <p class="mt-2 text-sm text-text-muted">{{ r.refund.method === 'original' ? 'To the original payment method' : 'As store credit' }}</p>
          <ul class="mt-2 list-disc pl-5 text-xs text-text-muted">
            @for (n of r.refund.notes; track n) {
              <li>{{ n }}</li>
            }
          </ul>
          <p class="mt-3 text-xs text-text-muted">Policy at request time: {{ r.policy.windowDays }}-day window, ₹{{ r.policy.returnFee / 100 }} fee.</p>
        </aside>
      </div>
    } @else if (resource.status() === 'error') {
      <ui-error-state (retry)="resource.reload()" />
    } @else {
      <ui-skeleton class="h-64" />
    }
  `,
})
export class ReturnDetailPageComponent {
  readonly id = input.required<string>();
  private readonly api = inject(AdminReturnApi);
  private readonly toast = inject(ToastService);

  protected readonly resource = rxResource({ params: () => this.id(), stream: ({ params }) => this.api.get(params) });
  protected readonly missing = computed(() => {
    const e = this.resource.error();
    return this.resource.status() === 'error' && e instanceof ApiException && e.code === 'not_found';
  });
  protected readonly labels = RETURN_STATUS_LABEL;
  protected readonly tone = returnTone;
  protected readonly reasonLabel = (code: string) => reasonOf(code)?.label ?? code;
  protected readonly names = (r: { attachments: { name: string }[] }) => r.attachments.map((a) => a.name).join(', ');
  protected readonly minDate = today();

  protected readonly pickupDate = signal(today());
  protected readonly pickupNote = signal('');
  protected readonly rejectReason = signal('');
  protected readonly checkNote = signal('');
  protected readonly dispositions = signal<Record<string, Disposition>>({});
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly fields = signal<Record<string, string>>({});

  constructor() {
    inject(SeoService).set({ title: 'Return', noindex: true });
  }

  protected setDisposition(variantId: string, value: string): void {
    this.dispositions.update((d) => {
      const next = { ...d };
      if (value === 'restock' || value === 'scrap') next[variantId] = value;
      else delete next[variantId];
      return next;
    });
  }

  /** Runs one staff action, showing server field errors beside the inputs and other errors above the page. */
  private async run(action: () => Promise<unknown>, done: string): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    this.fields.set({});
    try {
      await action();
      this.toast.success(done);
      this.resource.reload();
    } catch (e) {
      if (e instanceof ApiException) {
        this.fields.set(e.fields ?? {});
        if (!e.fields) this.error.set(e.message);
      } else this.error.set('Something went wrong. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }

  protected approve(id: string): Promise<void> {
    return this.run(() => firstValueFrom(this.api.approve(id, { pickupDate: this.pickupDate(), note: this.pickupNote() })), 'Return approved and pickup scheduled.');
  }

  protected reject(id: string): Promise<void> {
    return this.run(() => firstValueFrom(this.api.reject(id, this.rejectReason())), 'Return rejected.');
  }

  protected pickedUp(id: string): Promise<void> {
    return this.run(() => firstValueFrom(this.api.markPickedUp(id)), 'Marked as picked up.');
  }

  protected check(event: Event, id: string): Promise<void> {
    event.preventDefault();
    return this.run(() => firstValueFrom(this.api.recordCheck(id, { result: 'accepted', note: this.checkNote(), dispositions: this.dispositions() })), 'Quality check recorded and stock updated.');
  }

  protected failCheck(id: string): Promise<void> {
    return this.run(() => firstValueFrom(this.api.recordCheck(id, { result: 'rejected', note: this.checkNote() })), 'Return rejected after the quality check.');
  }

  protected refund(id: string): Promise<void> {
    return this.run(() => firstValueFrom(this.api.refund(id)), 'Refund issued.');
  }
}
