import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LocaleDatePipe, SeoService, ToastService } from '@ecom/shared/core';
import { ReturnApi } from '@ecom/shared/data-access';
import { ApiException, reasonOf } from '@ecom/shared/models';
import { MoneyPipe } from '@ecom/shared/util';
import { BadgeComponent, ButtonComponent, ErrorStateComponent, NotFoundComponent, SkeletonComponent } from '@ecom/shared/ui';
import { RETURN_STATUS_LABEL, returnTone } from './return-labels';

const STEPS = ['requested', 'approved', 'picked_up', 'checked', 'refunded'] as const;
const STEP_LABEL = { requested: 'Return requested', approved: 'Approved', picked_up: 'Picked up', checked: 'Quality check passed', refunded: 'Refund issued' } as const;

/** One return with its refund timeline (RF-04), which matches what staff see. */
@Component({
  selector: 'app-return-detail-page',
  imports: [LocaleDatePipe, NgOptimizedImage, RouterLink, MoneyPipe, BadgeComponent, ButtonComponent, ErrorStateComponent, NotFoundComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (notFound()) {
      <ui-not-found />
    } @else if (resource.hasValue()) {
      @let r = resource.value();
      <h1 class="mb-1 text-2xl font-bold md:text-3xl">Return {{ r.id }}</h1>
      <p class="mb-4 text-sm text-text-muted">For order <a [routerLink]="['/orders', r.orderId]" class="text-primary underline">{{ r.orderId }}</a> · <ui-badge [tone]="tone(r.status)">{{ labels[r.status] }}</ui-badge></p>

      <div class="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div class="space-y-6">
          <section aria-labelledby="progress">
            <h2 id="progress" class="mb-3 text-lg font-semibold">Progress</h2>
            <ol class="space-y-3 border-s-2 border-border ps-4">
              @for (step of steps(); track step.status) {
                <li class="relative">
                  <span class="absolute -start-[1.4rem] top-1 size-3 rounded-full" [class]="step.at ? 'bg-success' : 'bg-border-strong'" aria-hidden="true"></span>
                  <p [class]="step.at ? 'font-medium' : 'text-text-muted'">{{ step.label }}</p>
                  <p class="text-sm text-text-muted">{{ step.at ? (step.at | date: 'd MMM, h:mm a') : 'Pending' }}</p>
                </li>
              }
            </ol>
            @if (r.status === 'rejected') {
              <p class="mt-3 rounded-lg border border-danger p-3 text-sm" role="status"><strong>Not accepted.</strong> {{ r.rejectionReason }}</p>
            }
            @if (r.pickup && r.status === 'approved') {
              <p class="mt-3 rounded-lg border border-border p-3 text-sm" role="status">A courier will collect the items on <strong>{{ r.pickup.date | date: 'd MMM y' }}</strong>.@if (r.pickup.note) { <span class="block text-text-muted">Note: {{ r.pickup.note }}</span> }</p>
            }
          </section>

          <section aria-labelledby="items">
            <h2 id="items" class="mb-3 text-lg font-semibold">Items</h2>
            <ul class="divide-y divide-border rounded-lg border border-border">
              @for (i of r.items; track i.variantId) {
                <li class="flex items-center gap-3 p-3">
                  <img [ngSrc]="i.image.url" width="56" height="56" alt="" class="size-14 rounded-md object-cover" />
                  <span class="min-w-0 flex-1">
                    <a [routerLink]="['/p', i.slug]" class="block truncate font-medium hover:text-primary">{{ i.title }}</a>
                    <span class="text-sm text-text-muted">Quantity {{ i.quantity }} · {{ i.unitPrice | money }} each</span>
                  </span>
                </li>
              }
            </ul>
            <p class="mt-2 text-sm text-text-muted">Reason: {{ reasonLabel(r.reason) }}@if (r.comments) { · “{{ r.comments }}” }</p>
          </section>
        </div>

        <aside class="space-y-4">
          <section class="rounded-lg border border-border p-4" aria-labelledby="refund">
            <h2 id="refund" class="mb-2 font-semibold">Refund</h2>
            <dl class="space-y-1 text-sm">
              <div class="flex justify-between"><dt>Items</dt><dd>{{ r.refund.items | money }}</dd></div>
              @if (r.refund.discountShare.amount > 0) {
                <div class="flex justify-between"><dt>Coupon discount share</dt><dd>− {{ r.refund.discountShare | money }}</dd></div>
              }
              @if (r.refund.shippingRefund.amount > 0) {
                <div class="flex justify-between"><dt>Shipping</dt><dd>{{ r.refund.shippingRefund | money }}</dd></div>
              }
              @if (r.refund.returnFee.amount > 0) {
                <div class="flex justify-between"><dt>Return shipping fee</dt><dd>− {{ r.refund.returnFee | money }}</dd></div>
              }
              <div class="flex justify-between border-t border-border pt-2 text-base font-semibold"><dt>Total</dt><dd>{{ r.refund.total | money }}</dd></div>
            </dl>
            <p class="mt-2 text-sm text-text-muted">{{ r.refund.method === 'original' ? 'To your original payment method' : 'As store credit' }}@if (r.refundedAt) { · paid {{ r.refundedAt | date: 'd MMM y' }} }</p>
          </section>
          <div class="flex flex-wrap gap-2">
            @if (r.status === 'requested') {
              <button uiButton variant="ghost" type="button" [loading]="cancelling()" (click)="withdraw(r.id)">Withdraw request</button>
            }
            <a uiButton variant="secondary" routerLink="/account/support/new" [queryParams]="{ order: r.orderId }">Get help</a>
          </div>
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
  private readonly api = inject(ReturnApi);
  private readonly toast = inject(ToastService);

  protected readonly resource = rxResource({ params: () => this.id(), stream: ({ params }) => this.api.get(params) });
  protected readonly notFound = computed(() => {
    const e = this.resource.error();
    return this.resource.status() === 'error' && e instanceof ApiException && e.code === 'not_found';
  });
  protected readonly cancelling = signal(false);
  protected readonly labels = RETURN_STATUS_LABEL;
  protected readonly tone = returnTone;
  protected readonly reasonLabel = (code: string) => reasonOf(code)?.label ?? code;

  /** The five stages, each with the time it happened (absent while still ahead). */
  protected readonly steps = computed(() => {
    const r = this.resource.hasValue() ? this.resource.value() : undefined;
    return STEPS.map((status) => ({ status, label: STEP_LABEL[status], at: r?.timeline.find((t) => t.status === status)?.at }));
  });

  constructor() {
    inject(SeoService).set({ title: 'Return details', noindex: true, path: '/account/returns' });
  }

  protected async withdraw(id: string): Promise<void> {
    this.cancelling.set(true);
    try {
      await firstValueFrom(this.api.cancel(id));
      this.toast.info('Your return request was withdrawn.');
      this.resource.reload();
    } catch (e) {
      this.toast.error(e instanceof ApiException ? e.message : 'Could not withdraw this request.');
    } finally {
      this.cancelling.set(false);
    }
  }
}
