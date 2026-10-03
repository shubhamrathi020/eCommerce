import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LocaleDatePipe, SeoService, ToastService } from '@ecom/shared/core';
import { ReturnApi } from '@ecom/shared/data-access';
import { type AttachmentMeta, ApiException, RETURN_REASONS, type ReturnItemSelection } from '@ecom/shared/models';
import { MoneyPipe } from '@ecom/shared/util';
import { ButtonComponent, ErrorStateComponent, FormFieldComponent, InputDirective, NotFoundComponent, SkeletonComponent } from '@ecom/shared/ui';
import { AttachmentPickerComponent } from './attachment-picker';

const MAX_COMMENTS = 500;

/** Return request for one delivered order: choose items, a reason, see the refund before sending (RF-01, RF-03, RF-08). */
@Component({
  selector: 'app-return-request-page',
  imports: [LocaleDatePipe, NgOptimizedImage, RouterLink, MoneyPipe, ButtonComponent, ErrorStateComponent, FormFieldComponent, InputDirective, NotFoundComponent, SkeletonComponent, AttachmentPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-1 text-2xl font-bold md:text-3xl">Return items</h1>
    @if (notFound()) {
      <ui-not-found />
    } @else if (eligibility.hasValue()) {
      @let e = eligibility.value();
      <p class="mb-4 text-sm text-text-muted">Order {{ e.orderId }}@if (e.windowEndsAt) { · return by {{ e.windowEndsAt | date: 'd MMM y' }} }</p>

      @if (!e.eligible) {
        <div class="rounded-lg border border-border p-4" role="status">
          <p class="font-medium">This order can't be returned right now.</p>
          <p class="text-sm text-text-muted">{{ e.reason }}</p>
          <p class="mt-3 text-sm">Something wrong? <a class="text-primary underline" routerLink="/account/support/new" [queryParams]="{ order: e.orderId }">Contact support</a>.</p>
        </div>
      } @else {
        <form (submit)="submit($event)" novalidate class="max-w-2xl space-y-6">
          <fieldset>
            <legend class="mb-2 text-lg font-semibold">What are you returning?</legend>
            <ul class="divide-y divide-border rounded-lg border border-border">
              @for (line of e.lines; track line.variantId) {
                <li class="flex items-center gap-3 p-3">
                  <img [ngSrc]="line.image.url" width="56" height="56" alt="" class="size-14 shrink-0 rounded-md object-cover" />
                  <span class="min-w-0 flex-1">
                    <span class="block truncate font-medium">{{ line.title }}</span>
                    <span class="block text-sm text-text-muted">{{ line.unitPrice | money }} each · ordered {{ line.ordered }}</span>
                    @if (line.blockedReason) {
                      <span class="block text-sm text-text-muted">{{ line.blockedReason }}</span>
                    }
                  </span>
                  @if (line.returnable > 0) {
                    <label class="text-sm">
                      <span class="sr-only">Quantity to return for {{ line.title }}</span>
                      <select uiInput class="!w-20" (change)="setQuantity(line.variantId, $any($event.target).value)">
                        @for (n of range(line.returnable); track n) {
                          <option [value]="n">{{ n }}</option>
                        }
                      </select>
                    </label>
                  }
                </li>
              }
            </ul>
            @if (errors()['items']) {
              <p class="mt-1 text-sm text-danger" role="alert">{{ errors()['items'] }}</p>
            }
          </fieldset>

          <ui-form-field #r="uiFormField" label="Why are you returning it?" [required]="true" [error]="errors()['reason'] ?? ''">
            <select uiInput [id]="r.id" [attr.aria-describedby]="r.describedBy()" [attr.aria-invalid]="errors()['reason'] ? 'true' : null" (change)="reason.set($any($event.target).value)">
              <option value="">Choose a reason</option>
              @for (o of reasons; track o.code) {
                <option [value]="o.code">{{ o.label }}</option>
              }
            </select>
          </ui-form-field>

          <ui-form-field #c="uiFormField" label="Anything else we should know?" [hint]="comments().length + ' / ' + maxComments" [error]="errors()['comments'] ?? ''">
            <textarea uiInput rows="3" [id]="c.id" [attr.aria-describedby]="c.describedBy()" (input)="comments.set($any($event.target).value)"></textarea>
          </ui-form-field>

          <div>
            <app-attachment-picker (changed)="attachments.set($event)" />
            @if (errors()['attachments']) {
              <p class="mt-1 text-sm text-danger" role="alert">{{ errors()['attachments'] }}</p>
            }
          </div>

          <section class="rounded-lg border border-border p-4" aria-labelledby="refund-h" aria-live="polite">
            <h2 id="refund-h" class="mb-2 font-semibold">Your refund</h2>
            @if (quote.hasValue()) {
              @let q = quote.value();
              <dl class="space-y-1 text-sm">
                <div class="flex justify-between"><dt>Items</dt><dd>{{ q.items | money }}</dd></div>
                @if (q.discountShare.amount > 0) {
                  <div class="flex justify-between"><dt>Coupon discount share</dt><dd>− {{ q.discountShare | money }}</dd></div>
                }
                @if (q.shippingRefund.amount > 0) {
                  <div class="flex justify-between"><dt>Shipping</dt><dd>{{ q.shippingRefund | money }}</dd></div>
                }
                @if (q.returnFee.amount > 0) {
                  <div class="flex justify-between"><dt>Return shipping fee</dt><dd>− {{ q.returnFee | money }}</dd></div>
                }
                <div class="flex justify-between border-t border-border pt-2 text-base font-semibold"><dt>Refund</dt><dd>{{ q.total | money }}</dd></div>
              </dl>
              <ul class="mt-2 list-disc ps-5 text-sm text-text-muted">
                @for (n of q.notes; track n) {
                  <li>{{ n }}</li>
                }
              </ul>
            } @else if (quote.isLoading()) {
              <p class="text-sm text-text-muted">Working out your refund…</p>
            } @else {
              <p class="text-sm text-text-muted">Choose the items and a reason to see how much you will get back.</p>
            }
          </section>

          @if (formError()) {
            <p class="text-sm text-danger" role="alert">{{ formError() }}</p>
          }
          <button uiButton type="submit" [loading]="saving()">Request return</button>
        </form>
      }
    } @else if (eligibility.status() === 'error') {
      <ui-error-state (retry)="eligibility.reload()" />
    } @else {
      <ui-skeleton class="h-64 max-w-2xl" />
    }
  `,
})
export class ReturnRequestPageComponent {
  /** `?order=` */
  readonly order = input<string | undefined>();

  private readonly api = inject(ReturnApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly reasons = RETURN_REASONS;
  protected readonly maxComments = MAX_COMMENTS;
  protected readonly quantities = signal<Record<string, number>>({});
  protected readonly reason = signal('');
  protected readonly comments = signal('');
  protected readonly attachments = signal<AttachmentMeta[]>([]);
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly formError = signal('');
  protected readonly saving = signal(false);

  protected readonly eligibility = rxResource({ params: () => this.order(), stream: ({ params }) => this.api.eligibility(params) });
  protected readonly notFound = computed(() => {
    const err = this.eligibility.error();
    return this.eligibility.status() === 'error' && err instanceof ApiException && err.code === 'not_found';
  });
  private readonly selections = computed<ReturnItemSelection[]>(() =>
    Object.entries(this.quantities())
      .filter(([, quantity]) => quantity > 0)
      .map(([variantId, quantity]) => ({ variantId, quantity })),
  );
  /** The refund is worked out by the API as soon as there is something to price. */
  protected readonly quote = rxResource({
    params: () => (this.order() && this.selections().length > 0 && this.reason() ? { order: this.order() as string, items: this.selections(), reason: this.reason() } : undefined),
    stream: ({ params }) => this.api.quote(params.order, params.items, params.reason),
  });

  constructor() {
    inject(SeoService).set({ title: 'Return items', noindex: true, path: '/account/returns/new' });
  }

  protected range(max: number): number[] {
    return Array.from({ length: max + 1 }, (_, i) => i);
  }

  protected setQuantity(variantId: string, value: string): void {
    this.quantities.update((q) => ({ ...q, [variantId]: Number(value) }));
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.errors.set({});
    this.formError.set('');
    const local: Record<string, string> = {};
    if (this.selections().length === 0) local['items'] = 'Choose at least one item';
    if (!this.reason()) local['reason'] = 'Choose a reason';
    if (this.comments().length > MAX_COMMENTS) local['comments'] = `Comments are limited to ${MAX_COMMENTS} characters`;
    if (Object.keys(local).length) {
      this.errors.set(local);
      return;
    }
    this.saving.set(true);
    try {
      const created = await firstValueFrom(this.api.create({ orderId: this.order() as string, items: this.selections(), reason: this.reason(), comments: this.comments(), attachments: this.attachments() }));
      this.toast.success('Return requested. We will review it shortly.');
      await this.router.navigate(['/account/returns', created.id]);
    } catch (e) {
      if (e instanceof ApiException) {
        this.errors.set(e.fields ?? {});
        this.formError.set(e.fields ? '' : e.message);
      } else this.formError.set('Could not send your request. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }
}
