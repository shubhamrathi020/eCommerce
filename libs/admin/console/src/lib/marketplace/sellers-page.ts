import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LocaleDatePipe, SeoService, ToastService } from '@ecom/shared/core';
import { AdminSellerApi, type SellerWithCounts } from '@ecom/shared/data-access';
import { ApiException, SELLER_STATUS_LABEL, type SellerStatus } from '@ecom/contracts';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, FormFieldComponent, InputDirective, SkeletonComponent } from '@ecom/shared/ui';

/** Seller applications (review the KYC details, approve or reject with a reason) and the sellers already trading (commission override, suspend, restore). */
@Component({
  selector: 'adm-sellers',
  imports: [LocaleDatePipe, BadgeComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, FormFieldComponent, InputDirective, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="mb-4 max-w-2xl text-sm text-text-muted">{{ applications ? 'Check the details against the documents the seller sent, then approve or reject. A rejected applicant sees your reason and can apply again.' : 'Sellers with access to the portal. Suspending a seller takes their listings off sale at once.' }}</p>
    @if (resource.hasValue()) {
      @if (rows().length === 0) {
        <ui-empty-state [title]="applications ? 'No applications waiting' : 'No sellers yet'" />
      } @else {
        <ul class="space-y-4">
          @for (s of rows(); track s.id) {
            <li class="rounded-lg border border-border p-4">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h2 class="text-lg font-semibold">{{ s.displayName }} <ui-badge [tone]="tone(s.status)">{{ labels[s.status] }}</ui-badge></h2>
                <span class="text-sm text-text-muted">Applied {{ s.appliedAt | date: 'd MMM y' }}</span>
              </div>
              <dl class="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <div><dt class="inline text-text-muted">Legal name: </dt><dd class="inline">{{ s.legalName }}</dd></div>
                <div><dt class="inline text-text-muted">Phone: </dt><dd class="inline">{{ s.phone }}</dd></div>
                <div><dt class="inline text-text-muted">GSTIN: </dt><dd class="inline font-mono">{{ s.gstin }}</dd></div>
                <div><dt class="inline text-text-muted">PAN: </dt><dd class="inline font-mono">{{ s.pan }}</dd></div>
                <div class="sm:col-span-2"><dt class="inline text-text-muted">Address: </dt><dd class="inline">{{ s.address.line1 }}, {{ s.address.city }}, {{ s.address.state }} {{ s.address.pincode }}</dd></div>
                <div class="sm:col-span-2"><dt class="inline text-text-muted">Bank: </dt><dd class="inline">{{ s.bankHolder }}, {{ s.bankIfsc }}, account ending {{ s.bankAccountLast4 }}</dd></div>
                <div class="sm:col-span-2"><dt class="inline text-text-muted">Policies: </dt><dd class="inline">Returns: {{ s.policies.returns }} Shipping: {{ s.policies.shipping }}</dd></div>
                @if (!applications) {
                  <div><dt class="inline text-text-muted">Listings: </dt><dd class="inline">{{ s.liveProducts }} live, {{ s.pendingProducts }} waiting</dd></div>
                  <div><dt class="inline text-text-muted">Commission: </dt><dd class="inline">{{ s.commissionRate === undefined ? 'By the rules' : s.commissionRate + '% (override)' }}</dd></div>
                }
                @if (s.rejectionReason) {
                  <div class="sm:col-span-2"><dt class="inline text-text-muted">Rejection reason: </dt><dd class="inline">{{ s.rejectionReason }}</dd></div>
                }
              </dl>

              @if (error() && active() === s.id) {
                <p class="mt-2 text-sm text-danger" role="alert">{{ error() }}</p>
              }
              <div class="mt-3 flex flex-wrap items-end gap-2">
                @if (s.status === 'pending') {
                  <button uiButton size="sm" type="button" [loading]="busy() === s.id" (click)="approve(s)">Approve {{ s.displayName }}</button>
                  @if (rejecting() === s.id) {
                    <div class="min-w-64 flex-1">
                      <ui-form-field #r="uiFormField" label="Reason (the applicant will see it)" [error]="fieldError()">
                        <input uiInput [id]="r.id" [attr.aria-describedby]="r.describedBy()" [attr.aria-invalid]="fieldError() ? 'true' : null" (input)="reason.set($any($event.target).value)" />
                      </ui-form-field>
                    </div>
                    <button uiButton size="sm" variant="danger" type="button" [loading]="busy() === s.id" (click)="reject(s)">Confirm rejection of {{ s.displayName }}</button>
                    <button uiButton size="sm" variant="ghost" type="button" (click)="rejecting.set('')">Cancel</button>
                  } @else {
                    <button uiButton size="sm" variant="danger" type="button" (click)="startReject(s.id)">Reject {{ s.displayName }}</button>
                  }
                }
                @if (s.status === 'approved' || s.status === 'suspended') {
                  <ui-form-field #c="uiFormField" label="Commission override (%)" hint="Empty = use the rules">
                    <input uiInput inputmode="decimal" class="!w-32" [id]="c.id" [attr.aria-describedby]="c.describedBy()" [value]="s.commissionRate ?? ''" (input)="editCommission(s.id, $any($event.target).value)" />
                  </ui-form-field>
                  <button uiButton size="sm" variant="secondary" type="button" (click)="saveCommission(s)">Save commission for {{ s.displayName }}</button>
                  <button uiButton size="sm" [variant]="s.status === 'approved' ? 'danger' : 'secondary'" type="button" (click)="standing(s)">{{ s.status === 'approved' ? 'Suspend' : 'Restore' }} {{ s.displayName }}</button>
                }
              </div>
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
export class SellersPageComponent {
  private readonly api = inject(AdminSellerApi);
  private readonly toast = inject(ToastService);
  /** True on the Applications tab, false on the Sellers tab. */
  protected readonly applications = inject(ActivatedRoute).snapshot.data['mode'] === 'applications';
  protected readonly resource = rxResource({ stream: () => this.api.sellers() });
  protected readonly labels = SELLER_STATUS_LABEL;
  protected readonly rows = computed<SellerWithCounts[]>(() => (this.resource.hasValue() ? this.resource.value() : []).filter((s) => (this.applications ? s.status === 'pending' || s.status === 'rejected' : s.status === 'approved' || s.status === 'suspended')));

  protected readonly rejecting = signal('');
  protected readonly reason = signal('');
  protected readonly commission = signal('');
  protected readonly active = signal('');
  protected readonly busy = signal('');
  protected readonly error = signal('');
  protected readonly fieldError = signal('');

  constructor() {
    inject(SeoService).set({ title: this.applications ? 'Seller applications' : 'Sellers', noindex: true });
  }

  protected tone(status: SellerStatus) {
    return status === 'approved' ? 'success' : status === 'pending' ? 'warning' : 'danger';
  }

  protected startReject(id: string): void {
    this.rejecting.set(id);
    this.reason.set('');
    this.fieldError.set('');
  }

  private async run(s: SellerWithCounts, action: () => Promise<unknown>, done: string): Promise<void> {
    this.busy.set(s.id);
    this.active.set(s.id);
    this.error.set('');
    this.fieldError.set('');
    try {
      await action();
      this.toast.success(done);
      this.rejecting.set('');
      this.resource.reload();
    } catch (e) {
      if (e instanceof ApiException && e.fields?.['reason']) this.fieldError.set(e.fields['reason']);
      else if (e instanceof ApiException && e.fields?.['percent']) this.error.set(e.fields['percent']);
      else this.error.set(e instanceof ApiException ? e.message : 'That did not work. Please try again.');
    } finally {
      this.busy.set('');
    }
  }

  protected approve(s: SellerWithCounts): Promise<void> {
    return this.run(s, () => firstValueFrom(this.api.decideSeller(s.id, { approve: true })), `${s.displayName} approved.`);
  }

  protected reject(s: SellerWithCounts): Promise<void> {
    return this.run(s, () => firstValueFrom(this.api.decideSeller(s.id, { approve: false, reason: this.reason() })), `${s.displayName} rejected.`);
  }

  protected standing(s: SellerWithCounts): Promise<void> {
    return this.run(s, () => firstValueFrom(this.api.setStanding(s.id, s.status === 'approved' ? 'suspended' : 'approved')), s.status === 'approved' ? `${s.displayName} suspended.` : `${s.displayName} restored.`);
  }

  protected editCommission(id: string, value: string): void {
    this.active.set(id);
    this.commission.set(value);
  }

  protected saveCommission(s: SellerWithCounts): Promise<void> {
    // Only a box the person actually typed in changes anything; an emptied box means "use the rules".
    if (this.active() !== s.id) return Promise.resolve();
    const text = this.commission().trim();
    return this.run(s, () => firstValueFrom(this.api.setCommission(s.id, text === '' ? null : Number(text))), `Commission for ${s.displayName} saved.`);
  }
}
