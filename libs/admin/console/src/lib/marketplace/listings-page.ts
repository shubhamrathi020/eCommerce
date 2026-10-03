import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { LocaleDatePipe, SeoService, ToastService } from '@ecom/shared/core';
import { AdminSellerApi, type AdminSellerProduct } from '@ecom/shared/data-access';
import { ApiException, SELLER_PRODUCT_STATUS_LABEL, type SellerProductStatus } from '@ecom/shared/models';
import { MoneyPipe } from '@ecom/shared/util';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, FormFieldComponent, InputDirective, SkeletonComponent } from '@ecom/shared/ui';

/** Seller listings waiting for approval (MP-06). Only approved listings from sellers in good standing appear in the shop. */
@Component({
  selector: 'adm-seller-listings',
  imports: [LocaleDatePipe, MoneyPipe, BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, FormFieldComponent, InputDirective, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4 flex flex-wrap items-end gap-3">
      <div>
        <label for="ls" class="mb-1 block text-sm font-medium">Show</label>
        <select id="ls" uiInput class="!w-52" (change)="status.set($any($event.target).value)">
          @for (s of statuses; track s) {
            <option [value]="s" [selected]="status() === s">{{ labels[s] }}</option>
          }
        </select>
      </div>
    </div>
    @if (resource.hasValue()) {
      @if (resource.value().length === 0) {
        <ui-empty-state title="Nothing here" description="No listings with this status." />
      } @else {
        <ul class="space-y-3">
          @for (p of resource.value(); track p.id) {
            <li class="rounded-lg border border-border p-4">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h2 class="font-semibold">{{ p.title }} <ui-badge [tone]="p.status === 'approved' ? 'success' : p.status === 'rejected' ? 'danger' : p.status === 'pending' ? 'warning' : 'neutral'">{{ labels[p.status] }}</ui-badge></h2>
                <span class="text-sm text-text-muted">{{ p.sellerName }} · updated {{ p.updatedAt | date: 'd MMM y' }}</span>
              </div>
              <p class="mt-1 text-sm">{{ { amount: p.price, currency: 'INR' } | money }}@if (p.mrp) { <span class="text-text-muted"> (MRP {{ { amount: p.mrp, currency: 'INR' } | money }})</span> } · {{ p.stock }} in stock · {{ p.brandName }} · {{ p.categoryId }}</p>
              <p class="mt-1 text-sm text-text-muted">{{ p.description }}</p>
              @if (p.rejectionReason) {
                <p class="mt-1 text-sm">Rejected: {{ p.rejectionReason }}</p>
              }
              @if (error() && active() === p.id) {
                <p class="mt-2 text-sm text-danger" role="alert">{{ error() }}</p>
              }
              @if (p.status === 'pending') {
                <div class="mt-3 flex flex-wrap items-end gap-2">
                  <button uiButton size="sm" type="button" [loading]="busy() === p.id" (click)="approve(p)">Approve {{ p.title }}</button>
                  @if (rejecting() === p.id) {
                    <div class="min-w-64 flex-1">
                      <ui-form-field #r="uiFormField" label="Reason (the seller will see it)" [error]="fieldError()">
                        <input uiInput [id]="r.id" [attr.aria-describedby]="r.describedBy()" [attr.aria-invalid]="fieldError() ? 'true' : null" (input)="reason.set($any($event.target).value)" />
                      </ui-form-field>
                    </div>
                    <button uiButton size="sm" variant="danger" type="button" [loading]="busy() === p.id" (click)="reject(p)">Confirm rejection of {{ p.title }}</button>
                    <button uiButton size="sm" variant="ghost" type="button" (click)="rejecting.set('')">Cancel</button>
                  } @else {
                    <button uiButton size="sm" variant="danger" type="button" (click)="rejecting.set(p.id)">Reject {{ p.title }}</button>
                  }
                </div>
              }
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
export class ListingsPageComponent {
  private readonly api = inject(AdminSellerApi);
  private readonly toast = inject(ToastService);
  protected readonly labels = SELLER_PRODUCT_STATUS_LABEL;
  protected readonly statuses = Object.keys(SELLER_PRODUCT_STATUS_LABEL) as SellerProductStatus[];
  protected readonly status = signal<SellerProductStatus>('pending');
  protected readonly resource = rxResource({ params: () => this.status(), stream: ({ params }) => this.api.products(params) });

  protected readonly rejecting = signal('');
  protected readonly reason = signal('');
  protected readonly busy = signal('');
  protected readonly active = signal('');
  protected readonly error = signal('');
  protected readonly fieldError = signal('');

  constructor() {
    inject(SeoService).set({ title: 'Seller listings', noindex: true });
  }

  private async run(p: AdminSellerProduct, action: () => Promise<unknown>, done: string): Promise<void> {
    this.busy.set(p.id);
    this.active.set(p.id);
    this.error.set('');
    this.fieldError.set('');
    try {
      await action();
      this.toast.success(done);
      this.rejecting.set('');
      this.resource.reload();
    } catch (e) {
      if (e instanceof ApiException && e.fields?.['reason']) this.fieldError.set(e.fields['reason']);
      else this.error.set(e instanceof ApiException ? e.message : 'That did not work. Please try again.');
    } finally {
      this.busy.set('');
    }
  }

  protected approve(p: AdminSellerProduct): Promise<void> {
    return this.run(p, () => firstValueFrom(this.api.decideProduct(p.id, { approve: true })), `${p.title} is now live.`);
  }

  protected reject(p: AdminSellerProduct): Promise<void> {
    return this.run(p, () => firstValueFrom(this.api.decideProduct(p.id, { approve: false, reason: this.reason() })), `${p.title} rejected.`);
  }
}
